// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @author  .
 * @title   .
 * @dev     .
 * @notice  .
 */

contract ScpiNFT is ERC1155, Ownable {
    struct ScpiInfo {
        string  name;
        string  uri;
        uint    totalShares;
        uint    publicPrice;
        address scpiAddress;
    }

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    address _marketplaceAddress;
    mapping(uint256 => ScpiInfo) private _scpiInfos;

    constructor() ERC1155("") {}

    function setMarketplaceAdddress(address _mpAddress) external onlyOwner {
        _marketplaceAddress = _mpAddress;
    }

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
        uint tokenId,
        uint _publicPrice
    ) internal virtual {
        _scpiInfos[tokenId].publicPrice  = _publicPrice;
    }

    function _setScpiAddress(
        uint tokenId,
        address _scpiAddress
    ) internal virtual {
        _scpiInfos[tokenId].scpiAddress  = _scpiAddress;
    }

    /**
     * @dev     Register a new SCPI with wanted amount of shares, and send them to specified recipient
     *          The URI for this SCPI is also specified here.
     * @param   _recipient  .
     * @param   _scpiName  .
     * @param   _sharesAmount  .
     * @param   _scpiURI  .
     * @param   _publicPrice  .
     * @return  uint256  .
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
        _setScpiPublicPrice(newItemId, _publicPrice);
        _setScpiAddress(newItemId, _recipient);
        emit RegisterNewScpi(newItemId, _scpiName, _publicPrice, _scpiURI);
        return newItemId;
    }

    function getScpiCount(
    ) public view returns (uint) {
        return _tokenIds.current();
    }

    function getScpiInfos(
    ) public view returns (ScpiInfo[] memory) {
        ScpiInfo[] memory infos = new ScpiInfo[](_tokenIds.current());
        for (uint i; i < _tokenIds.current(); i++) {
            infos[i] = _scpiInfos[i+1];
        }
        return infos;
    }

    function setScpiPublicPrice(
        uint tokenId,
        uint _publicPrice
    ) public onlyOwner {
        _scpiInfos[tokenId].publicPrice  = _publicPrice;
    }

    /**
     * @notice  .
     * @dev     .
     * @param   tokenId  .
     * @return  string  .
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        return _scpiInfos[tokenId].uri;
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override {
        require(msg.sender == owner() ||
                msg.sender == _marketplaceAddress || // marketplace shall be able to transfert tokens from any address to any address
                (msg.sender == _scpiInfos[id].scpiAddress && msg.sender == from) // SCPI can only transfer shares from its wallet
                ,"Please use Marketplace to sell your shares");
        _safeTransferFrom(from, to, id, amount, data);

        // Once transfert is done, automatically allow marketplace to manage NFTs
        setApprovalForAll(_marketplaceAddress,true);
    }

    /* Events */
    event RegisterNewScpi(uint256 companyId, string name, uint publicPrice, string uri);
}
