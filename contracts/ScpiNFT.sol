// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title   ScpiNFT
 * @dev     This contract describes the behaviour of a SCPI shares. A share is a token of a minted NFT.
 *          Every SCPI is represented with a tokenId and can only be minted by the contract owner.
 *          A SCPI store these different informations :
 *          - A name
 *          - Number of existing shares
 *          - The public price of a share
 *          - The address of the SCPI (where the shares are send)
 *          - An uri
 * 
 *          A SCPI share is a regulated product and has some constraints :
 *          - It can't be sold at a higher price than public price
 *          - It can't be send from one owner from another directly
 *          - It can't be "sold for free"
 *          - Seller and buyer are required to have a valid KYC for the SCPI owning the shares (not yet implemented)
 * 
 *          Because of these constraints, the shares will have to be sold on a dedicated and controlled
 *          marketplace. The address of the marketplace shall be set using setMarketplaceAddress function.
 * 
 *          The SCPI has the right to send tokens from its wallet to another.
 *          The marketplace has full right to transfer tokens from a wallet to another.
 *          Batch transfert feature is disabled (may be updated and enabled later if needed)
 */

contract ScpiNFT is ERC1155, Ownable {
    using Counters for Counters.Counter;

    // Structure to store SCPI related data
    struct ScpiInfo {
        string  name;
        string  uri;
        uint    totalShares;
        uint    publicPrice;
        address scpiAddress;
    }

    // To keep track of tokenIds
    Counters.Counter private _tokenIds;

    // Address of the marketplace
    address _marketplaceAddress;

    // Mapping to store ScpiInfo for each tokenId
    mapping(uint256 => ScpiInfo) private _scpiInfos;

    /**
     * @dev Constructor to initialize the contract.
     */
    constructor() ERC1155("") {}

    /* Events */
    /**
    * @dev Emitted when owner registered a new SCPI
    */
    event RegisterNewScpi(uint256 companyId, string name, uint publicPrice, string uri, uint amount, address recipient);

    /**
    * @dev Emitted when SCPI is changing the shares public price
    */
    event SetNewSharePrice(uint256 companyId, uint newPrice);

    /**
     * @notice Function to set the marketplace address
     * @dev Only callable by contract owner
     * @param _mpAddress Address of the marketplace
     */
    function setMarketplaceAddress(address _mpAddress) external onlyOwner {
        _marketplaceAddress = _mpAddress;
        setApprovalForAll(_marketplaceAddress,true);
    }

    // Internal functions to set SCPI attributes for a given tokenId
    function _setScpiURI(
        uint256 tokenId,
        string memory _scpiURI
    ) internal virtual {
        _scpiInfos[tokenId].uri = _scpiURI;
    }

    function _setScpiName(
        uint256 tokenId,
        string memory _scpiName
    ) internal virtual {
        _scpiInfos[tokenId].name = _scpiName;
    }

    function _setScpiSharesAmount(
        uint256 tokenId,
        uint256 _scpiSharesAmount
    ) internal virtual {
        _scpiInfos[tokenId].totalShares = _scpiSharesAmount;
    }

    function _setScpiPublicPrice(
        uint _tokenId,
        uint _publicPrice
    ) internal virtual {
        _scpiInfos[_tokenId].publicPrice  = _publicPrice;
    }

    function _setScpiAddress(
        uint _tokenId,
        address _scpiAddress
    ) internal virtual {
        _scpiInfos[_tokenId].scpiAddress  = _scpiAddress;
    }

    /**
     * @notice Register a new SCPI with specified amount of shares, and send them to specified recipient
     *          The URI for this SCPI is also specified here.
     * @dev Only callable by contract owner
     * @param _recipient The recipient address for the SCPI shares
     * @param _scpiName The name of the SCPI
     * @param _sharesAmount The number of shares for the SCPI
     * @param _scpiURI The URI for the SCPI
     * @param _publicPrice The public price for the SCPI shares
     * @return newItemId The token id of the new SCPI
     */
    function registerNewScpi(
        address         _recipient,
        string  memory  _scpiName,
        uint            _sharesAmount,
        string memory   _scpiURI,
        uint            _publicPrice
    ) public onlyOwner returns (uint256) {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(_recipient, newItemId, _sharesAmount, "");
        _setScpiURI(newItemId, _scpiURI);
        _setScpiName(newItemId, _scpiName);
        _setScpiSharesAmount(newItemId, _sharesAmount);
        _setScpiPublicPrice(newItemId, _publicPrice);
        _setScpiAddress(newItemId, _recipient);
        emit RegisterNewScpi(newItemId, _scpiName, _publicPrice, _scpiURI, _sharesAmount, _recipient);
        return newItemId;
    }

    /**
     * @notice  Set new price for a share. Only SCPI is allowed to change the price
     *          TODO : Inform the marketplace smartcontract about the price change
     *          to trigger some sell cancel if sellers wants to cancel their sale
     *          in case of price change.
     * @dev Only callable by the SCPI owner
     * @param _tokenId The token id of the SCPI
     * @param _publicPrice The new public price
     */
    function setPublicSharePrice(
        uint _tokenId,
        uint _publicPrice
    ) public {
        require (msg.sender == _scpiInfos[_tokenId].scpiAddress,"Only SCPI owner is allowed to update share price");
        require (_tokenId <= _tokenIds.current(),"SCPI is not existing");
        require (_publicPrice > 0, "Public price shall be greater than 0");
        _scpiInfos[_tokenId].publicPrice  = _publicPrice;
        emit SetNewSharePrice(_tokenId,_publicPrice);
    }

    /**
     * @notice Get the public price for a SCPI
     * @param _tokenId The token id of the SCPI
     * @return The public price for the SCPI
     */
    function getPublicSharePrice(
        uint _tokenId
    ) public view returns (uint256) {
        require (_tokenId <= _tokenIds.current(),"SCPI is not existing");
        return _scpiInfos[_tokenId].publicPrice;
    }

    /**
     * @notice Get the URI for a SCPI
     * @param _tokenId The token id of the SCPI
     * @return The URI for the SCPI
     */
    function uri(uint256 _tokenId) public view override returns (string memory) {
        return _scpiInfos[_tokenId].uri;
    }

    /**
     * @notice  Override for safeTransferFrom to take into account our specificities :
     *          - marketplace shall be able to transfer from any address to any other address
     *          - scpi shall be able to send the tokens it owns to any address
     *          This function will allow to transfer one SCPI tokens from an address to another.
     * @dev Only allows marketplace to transfer tokens from any address, SCPI owner to transfer their own tokens
     * @param from The sender address
     * @param to The recipient address
     * @param id The token id
     * @param amount The amount of tokens
     * @param data Additional data
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override {
        require(msg.sender == _marketplaceAddress || // marketplace shall be able to transfert tokens from any address to any address
                (msg.sender == _scpiInfos[id].scpiAddress && msg.sender == from) // SCPI can only transfer shares from its wallet
                ,"Please use Marketplace to sell your shares");
        _safeTransferFrom(from, to, id, amount, data);
    }

    /**
     * @notice Disallow batch transfers
     */
    function safeBatchTransferFrom(
        address,// from,
        address,// to,
        uint256[] memory,// ids,
        uint256[] memory,// amounts,
        bytes memory // data
    ) public virtual override {
        revert("safeBatchTransferFrom not allowed");
    }
}
