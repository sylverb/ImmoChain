// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./SellOrderSetLib.sol";
import "./ScpiNFT.sol";

/**
 * @dev     Contract to implement buying and selling of ERC1155 SCPI shares
 */

contract Marketplace {
    /********************************************************/
    /* Local storage                                        */
    /********************************************************/
    // Use SellOrderSetLib for SellOrderSetLib.Set operations
    using SellOrderSetLib for SellOrderSetLib.Set;

    // Mapping to store sellers money to allow them to claim it
    mapping(address => uint256) private sellersWallets;

    // Mapping to store sell orders for different NFTs
    mapping(bytes32 => SellOrderSetLib.Set) private orders;

    // Contract of the scpiNft we will interact with
    address private scpiNftContract;

    /********************************************************/
    /* Marketplace events                                   */
    /********************************************************/
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

    // Event to indicate a token is unlisted from sale
    event UnlistedFromSale(
        // Account address of the token owner
        address account,
        // NFT id
        uint256 nftId
    );

    // Event to indicate a token is sold
    event TokensSold(
        // Account address of the token seller
        address from,
        // Account address of the token buyer
        address to,
        // NFT id
        uint256 nftId,
        // Number of tokens sold
        uint256 tokenCount,
        // Purchase amount
        uint256 puchaseAmount
    );

    // We have to get the ScpiNFT contract address
    constructor (address _scpiNftContract) {
        scpiNftContract = _scpiNftContract;
    }

    receive() external payable {
    }

    fallback() external payable {
    }

    /**
     * createSellOrder - Creates a sell order for the NFT specified by `nftId`.
     *
     * @param nftId          - The ID of the NFT to be sold.
     * @param unitPrice      - The price of a single NFT in % of the public price.
     * @param noOfTokensForSale - The number of NFTs being sold.
     */

    function createSellOrder(
        uint256 nftId,
        uint256 unitPrice,
        uint256 noOfTokensForSale
    ) external {
        // Require that the unit price of each token must be greater than 0
        require((unitPrice >= 30) && (unitPrice <= 100), "Marketplace: price is a % and can't be lower than 30");

        // Get the unique identifier for the sell order
        bytes32 orderId = _getOrdersMapId(nftId);

        // Get the sell order set for the given NFT
        SellOrderSetLib.Set storage nftOrders = orders[orderId];

        // Require that the token is not already listed for sale by the same owner
        require(
            !nftOrders.orderExistsForAddress(msg.sender),
            "Marketplace: Token is already listed for sale by the given owner"
        );

        // Get the ERC1155 contract
        IERC1155 tokenContract = IERC1155(scpiNftContract);

        // Require that the caller has sufficient balance of the NFT token
        require(
            tokenContract.balanceOf(msg.sender, nftId) >=
                noOfTokensForSale,
            "Marketplace: Insufficient token balance"
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
     * cancelSellOrder - Cancels the sell order created by the caller for a specific NFT token.
     *
     * @param nftId ID of the NFT token to cancel the sell order for.
     */
    function cancelSellOrder(uint256 nftId) external {
        // Get the unique identifier for the order set of the given NFT token.
        bytes32 orderId = _getOrdersMapId(nftId);

        // Get the sell order set of the given NFT token.
        SellOrderSetLib.Set storage nftOrders = orders[orderId];

        // Ensure that the sell order exists for the caller.
        require(
            nftOrders.orderExistsForAddress(msg.sender),
            "Marketplace: Given token is not listed for sale by the owner"
        );

        // Remove the sell order from the set.
        nftOrders.remove(nftOrders.orderByAddress(msg.sender));

        // Emit an event indicating that the sell order has been unlisted.
        emit UnlistedFromSale(msg.sender, nftId);
    }

    /**
     * createBuyOrder - Create a buy order for an NFT token.
     *
     * @param nftId - unique identifier of the NFT token.
     * @param noOfTokensToBuy - number of tokens the buyer wants to purchase.
     * @param tokenOwner - address of the seller who is selling the token.
     */

    function createBuyOrder(
        uint256 nftId,
        uint256 noOfTokensToBuy,
        address payable tokenOwner
    ) external payable {
        // Get the unique identifier for the order set of the given NFT token.
        bytes32 orderId = _getOrdersMapId(nftId);

        // Get the sell order set of the given NFT token.
        SellOrderSetLib.Set storage nftOrders = orders[orderId];

        // Check if the token owner has a sell order for the given NFT.
        require(
            nftOrders.orderExistsForAddress(tokenOwner),
            "Marketplace: Given token is not listed for sale by the owner"
        );

        // Get the sell order for the given NFT by the token owner.
        SellOrderSetLib.SellOrder storage sellOrder = nftOrders.orderByAddress(
            tokenOwner
        );

        // Validate that the required buy quantity is available for sale
        require(
            sellOrder.quantity >= noOfTokensToBuy,
            "Marketplace: Attempting to buy more than available for sale"
        );

        // Get the ScpiNFT contract
        ScpiNFT tokenContract = ScpiNFT(scpiNftContract);

        // Validate that the buyer provided enough funds to make the purchase.
        uint256 publicPrice = tokenContract.getPublicSharePrice(nftId);
        uint256 buyPrice = (sellOrder.unitPrice * publicPrice * noOfTokensToBuy)/100;
        require(
            msg.value >= buyPrice,
            "Marketplace: Less ETH provided for the purchase"
        );

        // Assign the specified value of Ether to the token seller
        sellersWallets[tokenOwner] += msg.value;

        // Transfer the specified number of tokens from the token owner to the buyer.
        tokenContract.safeTransferFrom(
            tokenOwner,
            msg.sender,
            nftId,
            noOfTokensToBuy,
            ""
        );

        /**
         * Check if the quantity of tokens being sold in the sell order is equal to the number of tokens the buyer wants to purchase.
         * If true, it removes the sell order from the list of NFT orders.
         * Otherwise, update the sell order by subtracting the number of tokens bought from the total quantity being sold.
         */
        if (sellOrder.quantity == noOfTokensToBuy) {
            nftOrders.remove(sellOrder);
        } else {
            sellOrder.quantity -= noOfTokensToBuy;
        }

        // Emit TokensSold event on successfull purchase
        emit TokensSold(
            tokenOwner,
            msg.sender,
            nftId,
            noOfTokensToBuy,
            msg.value
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

    function withdrawFunds() external {
        uint256 amount = sellersWallets[msg.sender];
        require(amount > 0, "No funds available to withdraw");

        sellersWallets[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function getFundsInfo() external view returns (uint256) {
        return sellersWallets[msg.sender];
    }

}