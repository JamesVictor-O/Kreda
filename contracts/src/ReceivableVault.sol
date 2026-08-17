// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Attestation} from "./Attestation.sol";

/// @notice Investor deposits and share accounting for a single funded
/// receivable — one vault per receivable, not a pooled vault. Simpler to
/// reason about, simpler to demo, and pooled economics are out of scope.
///
/// @dev Share math is entirely OpenZeppelin's ERC4626 — deposit/mint/
/// withdraw/redeem are inherited, not reimplemented. Only the max* limits
/// are overridden, to gate deposits and redemptions by lifecycle state.
contract ReceivableVault is ERC4626, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum State {
        Open,
        Funded,
        Settled,
        Defaulted
    }

    /// @dev Reference only — not consulted at runtime beyond construction,
    /// kept public so the vault's evidence trail is discoverable on-chain
    /// without an off-chain index.
    Attestation public immutable attestation;
    bytes32 public immutable attestationId;

    address public immutable seller;
    address public immutable treasury;
    address public immutable settlement;

    uint256 public immutable targetAmount;
    uint16 public immutable yieldBps;
    uint16 public immutable feeBps;
    uint64 public immutable maturity;

    bool public funded;
    bool public settled;

    event SellerFunded(address indexed seller, uint256 netAmount, uint256 feeAmount);
    event PayoutReceived(uint256 amount);

    error AttestationNotApproved();
    error InvalidFee();
    error InvalidMaturity();
    error InvalidTargetAmount();
    error OnlySettlement();
    error NotOpen();
    error AlreadySettled();
    error TargetNotReached();
    error ZeroAddress();

    /// @param asset_ The stablecoin investors deposit and the seller is paid in.
    /// @param name_ Vault share token name, e.g. "Kreda Receivable #2847".
    /// @param symbol_ Vault share token symbol, e.g. "kRCV-2847".
    /// @param attestation_ The Attestation contract backing this vault.
    /// @param attestationId_ The approved attestation this vault funds. Must
    /// resolve to an approved record — declines never get a vault.
    /// @param targetAmount_ The advance amount to raise from investors.
    /// @param yieldBps_ Target yield in basis points, informational — the
    /// actual redemption value is whatever Settlement lands in the vault.
    /// @param maturity_ Timestamp after which, absent a settled payout, the
    /// vault is considered Defaulted.
    /// @param feeBps_ Origination fee in basis points, taken from
    /// targetAmount at fundSeller() and sent to `treasury_`.
    /// @param treasury_ Recipient of the origination fee.
    /// @param settlement_ The only address allowed to call receivePayout().
    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        Attestation attestation_,
        bytes32 attestationId_,
        uint256 targetAmount_,
        uint16 yieldBps_,
        uint64 maturity_,
        uint16 feeBps_,
        address treasury_,
        address settlement_
    ) ERC20(name_, symbol_) ERC4626(asset_) {
        Attestation.Record memory record = attestation_.get(attestationId_);
        if (!record.approved) revert AttestationNotApproved();
        if (targetAmount_ == 0) revert InvalidTargetAmount();
        if (maturity_ <= block.timestamp) revert InvalidMaturity();
        if (feeBps_ > 10_000) revert InvalidFee();
        if (treasury_ == address(0) || settlement_ == address(0)) revert ZeroAddress();

        attestation = attestation_;
        attestationId = attestationId_;
        seller = record.seller;
        targetAmount = targetAmount_;
        yieldBps = yieldBps_;
        maturity = maturity_;
        feeBps = feeBps_;
        treasury = treasury_;
        settlement = settlement_;
    }

    /// @notice The vault's current lifecycle stage.
    /// @dev Settled is terminal and takes priority over a passed maturity —
    /// a vault that settles late is still Settled, not Defaulted. Defaulted
    /// is a pure function of time, not a transaction someone has to send.
    function state() public view returns (State) {
        if (settled) return State.Settled;
        if (block.timestamp > maturity) return State.Defaulted;
        if (funded) return State.Funded;
        return State.Open;
    }

    /// @notice Releases the raised advance, minus the origination fee, to
    /// the seller. Callable by anyone once the target is reached — funding
    /// completion is mechanical, not gated by role.
    function fundSeller() external nonReentrant {
        if (state() != State.Open) revert NotOpen();
        if (totalAssets() < targetAmount) revert TargetNotReached();
        funded = true;

        uint256 feeAmount = (targetAmount * feeBps) / 10_000;
        uint256 netAmount = targetAmount - feeAmount;

        IERC20 token = IERC20(asset());
        if (feeAmount > 0) token.safeTransfer(treasury, feeAmount);
        token.safeTransfer(seller, netAmount);

        emit SellerFunded(seller, netAmount, feeAmount);
    }

    /// @notice Pulls confirmed payout proceeds from the Settlement contract
    /// into the vault and opens redemptions. Only the immutable settlement
    /// address may call this, making the settlement trust boundary
    /// explicit on-chain — see Settlement's NatSpec for what that boundary
    /// actually trusts.
    function receivePayout(uint256 amount) external nonReentrant {
        if (msg.sender != settlement) revert OnlySettlement();
        if (settled) revert AlreadySettled();
        settled = true;

        IERC20(asset()).safeTransferFrom(msg.sender, address(this), amount);
        emit PayoutReceived(amount);
    }

    /// @dev Accepts deposits only while Open, capped at the remaining
    /// distance to targetAmount. Clamped at zero so a direct-transfer
    /// donation that pushes totalAssets() above target can't underflow.
    function maxDeposit(address) public view override returns (uint256) {
        if (state() != State.Open) return 0;
        uint256 current = totalAssets();
        return current >= targetAmount ? 0 : targetAmount - current;
    }

    /// @dev Mirrors maxDeposit in shares rather than assets.
    function maxMint(address) public view override returns (uint256) {
        if (state() != State.Open) return 0;
        uint256 current = totalAssets();
        if (current >= targetAmount) return 0;
        return _convertToShares(targetAmount - current, Math.Rounding.Floor);
    }

    /// @dev Investors are locked to maturity — redemptions are blocked
    /// before Settled. There is no secondary market and no early exit;
    /// pretending otherwise would create a redemption path with no
    /// backing assets behind it.
    function maxWithdraw(address owner_) public view override returns (uint256) {
        if (state() != State.Settled) return 0;
        return super.maxWithdraw(owner_);
    }

    function maxRedeem(address owner_) public view override returns (uint256) {
        if (state() != State.Settled) return 0;
        return super.maxRedeem(owner_);
    }

    function withdraw(uint256 assets, address receiver, address owner_) public override nonReentrant returns (uint256) {
        return super.withdraw(assets, receiver, owner_);
    }

    function redeem(uint256 shares, address receiver, address owner_) public override nonReentrant returns (uint256) {
        return super.redeem(shares, receiver, owner_);
    }
}
