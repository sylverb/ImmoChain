// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./ScpiNFT.sol";

/**
 * @dev     Contract to implement buying and selling of ERC1155 SCPI shares
 */

contract Marketplace {
    /********************************************************/
    /* Local storage                                        */
    /********************************************************/
    // We are storing data to be able to parse them by price set from the older to the newer

    // SellOrder structure representing a sell order, containing the address of the seller, the quantity of tokens being sold, and the unit price of the tokens.
    struct SellOrder {
        address seller; // Address of the seller
        uint256 quantity; // Quantity of tokens being sold
        uint256 unitPrice; // Unit price of the tokens
    }

    struct OrderPrice {
        uint256 price;
        uint256 total;
        uint256 ordersByPriceId;
    }

    // Set structure containing a mapping of seller addresses to indices in the keyList array, and an array of SellOrders.
    struct OrdersSet {
        mapping(address => SellOrder[]) ordersListBySeller;
        mapping(uint256 => SellOrder[]) ordersList;
        OrderPrice[] priceIdTable;
        uint256 currentPriceId;
    }

    /*************************************************************/

    // Mapping to store shares numbers sold by each seller for each nftId
    mapping(address => mapping(uint256 => uint256)) private userSellCounts;

    // Mapping to store sellers money to allow them to claim it
    mapping(address => uint256) private sellersWallets;

    // Mapping to store sell orders for different NFTs
    mapping(uint256 => OrdersSet) private orders;

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
        // Require that the unit price of each token must be between 30 and 100% with a 5 points step
        require((unitPrice >= 30) && (unitPrice <= 100) && (unitPrice % 5) == 0, "Marketplace: price is a % between 30 and 100% with a 5 points step");

        // Get the ERC1155 contract
        IERC1155 tokenContract = IERC1155(scpiNftContract);

        // Require that the caller has sufficient balance of the NFT token
        require(
            tokenContract.balanceOf(msg.sender, nftId) >=
                noOfTokensForSale + userSellCounts[msg.sender][nftId],
            "Marketplace: Insufficient token balance"
        );

        // Update total sale count for user
        userSellCounts[msg.sender][nftId] += noOfTokensForSale;

        // Create a new sell order
        // Get the sell order set for the given NFT
        OrdersSet storage nftOrders = orders[nftId];

        // Find the appropriate index to insert the new order price
        uint256 indexToInsert = 0;
        while (indexToInsert < nftOrders.priceIdTable.length && nftOrders.priceIdTable[indexToInsert].price < unitPrice) {
            indexToInsert++;
        }

        // If the price doesn't exist, create a new entry in priceIdTable
        if (indexToInsert == nftOrders.priceIdTable.length || nftOrders.priceIdTable[indexToInsert].price != unitPrice) {
            nftOrders.priceIdTable.push();
            // Shift elements to the right to make space for the new priceIdTable entry
            for (uint256 i = nftOrders.priceIdTable.length - 1; i > indexToInsert; i--) {
                nftOrders.priceIdTable[i] = nftOrders.priceIdTable[i - 1];
            }
            nftOrders.priceIdTable[indexToInsert] = OrderPrice(unitPrice, noOfTokensForSale, nftOrders.currentPriceId++);
        } else {
            nftOrders.priceIdTable[indexToInsert].total += noOfTokensForSale;
        }

        SellOrder memory order = SellOrder(msg.sender, noOfTokensForSale, unitPrice);

        // Add the order to ordersList
        nftOrders.ordersList[unitPrice].push(order);

        // Add the order to ordersListBySeller
        nftOrders.ordersListBySeller[msg.sender].push(order);

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
        // Get the sell order set of the given NFT token.
        OrdersSet storage nftOrders = orders[nftId];

        // Ensure that the sell order exists for the caller.
        uint256 ordersCount = nftOrders.ordersListBySeller[msg.sender].length;
        require(
            ordersCount > 0,
            "Marketplace: Given token is not listed for sale by the owner"
        );

        // Get last order
        SellOrder memory order = nftOrders.ordersListBySeller[msg.sender][ordersCount-1];

        // Remove the sell order from the orders sets.
        nftOrders.ordersListBySeller[msg.sender].pop();
        uint256 ordersCountByPrice = nftOrders.ordersList[order.unitPrice].length;
        for (uint256 i = ordersCountByPrice-1; i >= 0; i--) {
            if (nftOrders.ordersList[order.unitPrice][i].seller == msg.sender) {
                for (uint256 j = i; j < ordersCountByPrice - 1; j++) {
                    nftOrders.ordersList[order.unitPrice][j] = nftOrders.ordersList[order.unitPrice][j+1];
                }
                nftOrders.ordersList[order.unitPrice].pop();
                break;
            }
        }

        // Update total sale count for user and price table
        userSellCounts[msg.sender][nftId] -= order.quantity;

        // Find the appropriate index to update the new quantity
        uint256 indexToUpdate = 0;
        while (indexToUpdate < nftOrders.priceIdTable.length && nftOrders.priceIdTable[indexToUpdate].price < order.unitPrice) {
            indexToUpdate++;
        }

        if (indexToUpdate < nftOrders.priceIdTable.length) {
            OrderPrice storage priceTable = nftOrders.priceIdTable[indexToUpdate];
            priceTable.total -= order.quantity;
        }

        // Emit an event indicating that the sell order has been unlisted.
        emit UnlistedFromSale(msg.sender, nftId);
    }

    /**
     * createBuyOrder - Create a buy order for an NFT token.
     *
     * @param nftId - unique identifier of the NFT token.
     * @param noOfTokensToBuy - number of tokens the buyer wants to purchase.
     */

    function createBuyOrder(
        uint256 nftId,
        uint256 noOfTokensToBuy
    ) external payable {
        // Get the ScpiNFT contract & public price
        ScpiNFT tokenContract = ScpiNFT(scpiNftContract);
        uint256 publicPrice = tokenContract.getPublicSharePrice(nftId);

        OrdersSet storage nftOrders = orders[nftId];
        uint256 remainingQuantity = noOfTokensToBuy;
        uint256 availablePayment = msg.value;

        uint256 ordersToDelete;

        // We will parse all the sale orders until we filled the noOfTokensToBuy
        for (uint256 priceRangeIndex = 0; priceRangeIndex < nftOrders.priceIdTable.length; priceRangeIndex++) { // Parse sales orders from cheaper to most expensive
            OrderPrice storage priceTable = nftOrders.priceIdTable[priceRangeIndex];
            SellOrder[] storage ordersList = nftOrders.ordersList[priceTable.price];
            // Parse all sales in the price range
            for (uint256 orderIndex = 0; orderIndex < ordersList.length; orderIndex++) {
                SellOrder storage order = ordersList[orderIndex];
                if (order.quantity > remainingQuantity) { // This will fill the request
                    uint256 buyPrice = (order.unitPrice * publicPrice) / 100 * remainingQuantity;
                    // Reduce total amount of sold tokens for user and price table
                    userSellCounts[order.seller][nftId] -= remainingQuantity;
                    priceTable.total -= remainingQuantity;

                    // Assign the specified value of Ether to the token owner
                    require (availablePayment >= buyPrice,"Marketplace: Less ETH provided for the purchase");
                    availablePayment-=buyPrice;
                    sellersWallets[order.seller] += buyPrice;
                    
                    // Transfer the specified number of tokens from the token owner to the buyer.
                    tokenContract.safeTransferFrom(
                        order.seller,
                        msg.sender,
                        nftId,
                        remainingQuantity,
                        ""
                    );

                    // Emit TokensSold event on successfull purchase
                    emit TokensSold(
                        order.seller,
                        msg.sender,
                        nftId,
                        remainingQuantity,
                        msg.value
                    );

                    // This sell order will end filling the buy order
                    order.quantity -= remainingQuantity;
                    remainingQuantity = 0;
                    updateOldestOrder(nftId,order.seller,order.unitPrice,order.quantity);
                    break;
                } else {
                    // This sell order will partially fill the buy order
                    uint256 buyPrice = (order.unitPrice * publicPrice) / 100 * order.quantity;
                    remainingQuantity -= order.quantity;

                    // Reduce total amount of sold tokens for user and price table
                    userSellCounts[order.seller][nftId] -= order.quantity;
                    priceTable.total -= order.quantity;

                    // Assign the specified value of Ether to the token owner
                    require (availablePayment >= buyPrice,"Marketplace: Less ETH provided for the purchase");
                    availablePayment-=buyPrice;
                    sellersWallets[order.seller] += buyPrice;

                    // Transfer the specified number of tokens from the token owner to the buyer.
                    tokenContract.safeTransferFrom(
                        order.seller,
                        msg.sender,
                        nftId,
                        order.quantity,
                        ""
                    );

                    // Emit TokensSold event on successfull purchase
                    emit TokensSold(
                        order.seller,
                        msg.sender,
                        nftId,
                        order.quantity,
                        buyPrice
                    );

                    // Remove this order from orders list
                    deleteOldestOrder(nftId,order.seller,order.unitPrice);
                    ordersToDelete++;
                }
            }
        }

        require (remainingQuantity == 0, "Marketplace: Not enough shares in sale to fill the buy order");
        require (availablePayment == 0, "Marketplace: Too much money sent");

        // Delete orders that have been filled
        for (uint256 priceRangeIndex = 0; priceRangeIndex < nftOrders.priceIdTable.length; priceRangeIndex++) { // Parse sales orders from cheaper to most expensive
            SellOrder[] storage ordersList = nftOrders.ordersList[nftOrders.priceIdTable[priceRangeIndex].price];
            if (ordersList.length <= ordersToDelete) {
                ordersToDelete -= ordersList.length;
                delete nftOrders.ordersList[nftOrders.priceIdTable[priceRangeIndex].price];
            } else {
                for (uint256 index; index < ordersList.length-ordersToDelete; index++) {
                    ordersList[index] = ordersList[index+ordersToDelete];
                }
                while (ordersToDelete > 0) {
                    ordersList.pop();
                    ordersToDelete--;
                }
            }
        }
    }

    function deleteOldestOrder(uint256 nftId, address seller, uint256 price) private {
        SellOrder[] storage ordersList = orders[nftId].ordersListBySeller[seller];
        for (uint256 i = 0; i < ordersList.length; i++) {
            if (ordersList[i].unitPrice == price) {
                // Remove the sell order from the ordersListBySeller and shift the remaining elements
                for (uint256 j = i; j < ordersList.length - 1; j++) {
                    ordersList[j] = ordersList[j+1];
                }
                ordersList.pop();
                break;
            }
        }
    }

    function updateOldestOrder(uint256 nftId, address seller, uint256 price, uint256 newQuantity) private {
        SellOrder[] storage ordersList = orders[nftId].ordersListBySeller[seller];
        for (uint256 i = 0; i < ordersList.length; i++) {
            if (ordersList[i].unitPrice == price) {
                ordersList[i].quantity = newQuantity;
                break;
            }
        }
    }

    /**
     * getOrders: This function retrieves the sell orders for the given token
     * @param nftId unique identifier of the token
     * @return An array of sell orders for the given token
     */
    function getOrderCountByPrice(uint256 nftId)
        external
        view
        returns (OrderPrice[] memory)
    {
        OrdersSet storage nftOrders = orders[nftId];
        return nftOrders.priceIdTable;
    }


    /**
     * getOrderByAddress: Get the SellOrder of a token for a given owner
     * @param nftId unique identifier of the token
     * @param seller address of the owner
     * @return Sell order of a token for the given owner
     */
    function getOrdersByAddress(
        uint256 nftId,
        address seller
    ) public view returns (SellOrder[] memory) {
        OrdersSet storage nftOrders = orders[nftId];

        return nftOrders.ordersListBySeller[seller];
    }

    /**
     * @notice  .
     * @dev     .
     */
    function withdrawFunds() external {
        uint256 amount = sellersWallets[msg.sender];
        require(amount > 0, "No funds available to withdraw");

        sellersWallets[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function getBalanceInfo() external view returns (uint256) {
        return sellersWallets[msg.sender];
    }

}