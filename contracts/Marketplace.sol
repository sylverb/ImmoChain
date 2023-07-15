// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./SellOrderSetLib.sol";

// Contract to implement buying and selling of ERC1155 SCPI shares
contract Marketplace {
    // Use SellOrderSetLib for SellOrderSetLib.Set operations
    using SellOrderSetLib for SellOrderSetLib.Set;

    // Mapping to store sell orders for different NFTs
    mapping(bytes32 => SellOrderSetLib.Set) private orders;

    address private scpiNftContract;

    // Event to indicate a token is listed for sale
    event ListedForSale(
        // Account address of the token owner
        address account,
        // NFT id
        uint256 nftId,
        // Number of tokens for sale
        uint256 noOfTokensForSale,
        // Unit price of each token
        uint256 unitPrice
    );

    // We have to get the ScpiNFT contract address
    constructor (address _scpiNftContract) {
        scpiNftContract = _scpiNftContract;
    }

    /**
     * createSellOrder - Creates a sell order for the NFT specified by `nftId`.
     *
     * @param nftId          - The ID of the NFT to be sold.
     * @param unitPrice      - The price of a single NFT in wei.
     * @param noOfTokensForSale - The number of NFTs being sold.
     */

    function createSellOrder(
        uint256 nftId,
        uint256 unitPrice,
        uint256 noOfTokensForSale
    ) external {
        // Require that the unit price of each token must be greater than 0
        require(unitPrice > 0, "NFTTrade: Price must be greater than 0.");

        // Get the unique identifier for the sell order
        bytes32 orderId = _getOrdersMapId(nftId);

        // Get the sell order set for the given NFT
        SellOrderSetLib.Set storage nftOrders = orders[orderId];

        // Require that the token is not already listed for sale by the same owner
        require(
            !nftOrders.orderExistsForAddress(msg.sender),
            "NFTTrade: Token is already listed for sale by the given owner"
        );

        // Get the ERC1155 contract
        IERC1155 tokenContract = IERC1155(scpiNftContract);

        // Require that the caller has approved the NFTTrade contract for token transfer
        require(
            tokenContract.isApprovedForAll(msg.sender, address(this)),
            "NFTTrade: Caller has not approved NFTTrade contract for token transfer."
        );

        // Require that the caller has sufficient balance of the NFT token
        require(
            tokenContract.balanceOf(msg.sender, nftId) >=
                noOfTokensForSale,
            "NFTTrade: Insufficient token balance."
        );

        // Create a new sell order using the SellOrder constructor
        SellOrderSetLib.SellOrder memory o = SellOrderSetLib.SellOrder(
            msg.sender,
            noOfTokensForSale,
            unitPrice
        );
        nftOrders.insert(o);

        // Emit the 'ListedForSale' event to signal that a new NFT has been listed for sale
        emit ListedForSale(
            msg.sender,
            nftId,
            noOfTokensForSale,
            unitPrice
        );
    }

    /**
     * getOrders: This function retrieves the sell orders for the given token
     * @param nftId unique identifier of the token
     * @return An array of sell orders for the given token
     */
    function getOrders(uint256 nftId)
        external
        view
        returns (SellOrderSetLib.SellOrder[] memory)
    {
        bytes32 orderId = _getOrdersMapId(nftId);
        return orders[orderId].allOrders();
    }

    /**
     * getOrderByAddress: Get the SellOrder of a token for a given owner
     * @param nftId unique identifier of the token
     * @param listedBy address of the owner
     * @return Sell order of a token for the given owner
     */
    function getOrderByAddress(
        uint256 nftId,
        address listedBy
    ) public view returns (SellOrderSetLib.SellOrder memory) {
        // Calculate the unique identifier for the order
        bytes32 orderId = _getOrdersMapId(nftId);

        // Get the SellOrderSet for the NFT
        SellOrderSetLib.Set storage nftOrders = orders[orderId];

        // Check if a SellOrder exists for the given owner
        if (nftOrders.orderExistsForAddress(listedBy)) {
            // Return the SellOrder for the given owner
            return nftOrders.orderByAddress(listedBy);
        }

        // Else, return empty SellOrder
        return SellOrderSetLib.SellOrder(address(0), 0, 0);
    }

    // _getOrdersMapId function generates the unique identifier for a given NFT id
    // The identifier is used as the key to store the corresponding SellOrderSet in the `orders` mapping
    // This helps to retrieve and manage the sell orders for a specific NFT efficiently.
    function _getOrdersMapId(uint256 nftId)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(nftId));
    }
}