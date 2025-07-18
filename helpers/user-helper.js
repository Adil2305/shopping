var db = require("../config/connection");
var collection = require("../config/collection");
var bcrypt = require("bcrypt");
var { response } = require("../app");
const { getProduct } = require("./product-helper");
const objectId = require("mongodb").ObjectId;
//const userHelper = require('../helpers/user-helper');

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.password = await bcrypt.hash(userData.password, 10);
      db.get()
        .collection(collection.userCollection)
        .insertOne(userData)
        .then((data) => {
          resolve(data.ops[0]);
        });
    });
  },
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let response = {};
      let loginStatus = false;
      let user = await db
        .get()
        .collection(collection.userCollection)
        .findOne({ email: userData.email });
      if (user) {
        bcrypt.compare(userData.password, user.password).then((status) => {
          if (status) {
            console.log("login success");

            response.user = user;
            response.status = true;
            resolve(response);
          } else {
            console.log("login failled");
            resolve({ status: false });
          }
        });
      } else {
        console.log("email email doesnt exist");
        resolve({ status: false });
      }
    });
  },

  addToCart: (proId, userId) => {
    let proObj = {
      item: objectId(proId),
      quantity: 1,
    };
    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.cartCollection)
        .findOne({ user: objectId(userId) });
      if (userCart) {
        let proExit = userCart.products.findIndex(
          (product) => product.item == proId
        );
        if (proExit != -1) {
          db.get()
            .collection(collection.cartCollection)
            .updateOne(
              { user: objectId(userId), "products.item": objectId(proId) },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collection.cartCollection)
            .updateOne(
              { user: objectId(userId) },
              { $push: { products: proObj } } // fixed: use `proId`, not `userId`
            )
            .then((response) => {
              resolve();
            });
        }
      } else {
        let cartObj = {
          user: objectId(userId),
          products: [objectId(proId)],
        };
        db.get()
          .collection(collection.cartCollection)
          .insertOne(cartObj)
          .then((response) => {
            resolve();
          });
      }
    });
  },
getCartCount: (userId) => {
  return new Promise(async (resolve, reject) => {
    let cart = await db
      .get()
      .collection(collection.cartCollection)
      .findOne({ user: objectId(userId) });

    let count = 0;

    if (cart && cart.products) {
      count = cart.products.reduce((total, item) => {
        const qty = parseInt(item.quantity);
        return total + (isNaN(qty) ? 0 : qty);
      }, 0);
    }

    console.log('getCartCount:', count); // ✅ will now show valid number
    resolve(count);
  });
}

,

changeProQuantity: (details) => {
  const count = parseInt(details.count);
  const quantity = parseInt(details.quantity);

  return new Promise(async (resolve, reject) => {
    try {
      const dbInstance = db.get();
      const cartCol = dbInstance.collection(collection.cartCollection);

      // If quantity is 1 and user clicks -1 => remove product
      if (count === -1 && quantity === 1) {
        await cartCol.updateOne(
          { _id: objectId(details.cart) },
          { $pull: { products: { item: objectId(details.product) } } }
        );
        return resolve({ removeProduct: true });
      }

      // Otherwise, update quantity
      await cartCol.updateOne(
        {
          _id: objectId(details.cart),
          "products.item": objectId(details.product)
        },
        {
          $inc: { "products.$.quantity": count }
        }
      );

      // Calculate new total
      const totalAgg = await cartCol.aggregate([
        { $match: { _id: objectId(details.cart) } },
        { $unwind: "$products" },
        {
          $lookup: {
            from: collection.productCollection,
            localField: "products.item",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $multiply: [
                  { $toInt: "$products.quantity" },
                  { $toDouble: "$productDetails.price" }
                ]
              }
            }
          }
        }
      ]).toArray();

      const total = totalAgg[0]?.total || 0;
      resolve({ status: true, total });

    } catch (err) {
      console.error("❌ Error in changeProQuantity:", err);
      reject(err);
    }
  });
}

,

getCartProduct: (userId) => {
  return new Promise(async (resolve, reject) => {
    let cartItems = await db
      .get()
      .collection(collection.cartCollection)
      .aggregate([
        {
          $match: { user: objectId(userId) }
        },
        {
          $unwind: "$products"
        },
        {
          $project: {
            item: "$products.item",
            quantity: "$products.quantity"
          }
        },
        {
          $lookup: {
            from: collection.productCollection,
            localField: "item",
            foreignField: "_id",
            as: "product"
          }
        },
        {
          $unwind: "$product" // ✅ Only keep entries that matched
        },
        {
          $project: {
            item: 1,
            quantity: 1,
            product: 1
          }
        }
      ])
      .toArray();

    resolve(cartItems);
  });
}
,
getTolalAmount:(userId)=>{
return new Promise(async (resolve, reject) => {
    let cartItems = await db
      .get()
      .collection(collection.cartCollection)
      .aggregate([
        {
          $match: { user: objectId(userId) }
        },
        {
          $unwind: "$products"
        },
        {
          $project: {
            item: "$products.item",
            quantity: "$products.quantity"
          }
        },
        {
          $lookup: {
            from: collection.productCollection,
            localField: "item",
            foreignField: "_id",
            as: "product"
          }
        },
        {
          $project: {
            item: 1,
            quantity: 1,
            product: { $arrayElemAt: ["$product", 0] }
          }
        },
        {
         
  $group: {
    _id: null,
    total: {
      $sum: {
        $multiply: [
          { $toInt: '$quantity' },
          { $toDouble: '$product.price' }
        ]
      }
    }
  
}

        }
      ])
      .toArray();

 let total = cartItems[0]?.total || 0; 
 //console.log(total);
 
    resolve(total);
  });
},
placeOrder: (order, products, total) => {
  return new Promise(async (resolve, reject) => {
    try {
      const status = order.paymentMethod === 'COD' ? 'placed' : 'pending';

      const orderObj = {
        deliveryDetails: {
          name: order.fullName,
          mobile: order.phone,
          address: order.address,
          city: order.city,
          state: order.state,
          pincode: order.zip
        },
        userId: objectId(order.userId),
        paymentMethod: order.paymentMethod,
        products,
        totalAmount: total,
        status,
        date: new Date()
      };

      await db.get().collection(collection.orderCollection).insertOne(orderObj);
      resolve();
    } catch (error) {
      console.error("❌ Error in placeOrder helper:", error);
      reject(error);
    }
  });
}

,
getProductList:(userId)=>{
   return new Promise(async(resolve,reject)=>{
    console.log(userId);

    if (!objectId.isValid(userId)) {
      console.log("Invalid userId:", userId);
      return reject("Invalid userId");
    }

    let cart = await db.get().collection(collection.cartCollection).findOne({ user: objectId(userId) });
    resolve(cart?.products || []);
  });
},
getUserOrders: (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let orders = await db.get().collection(collection.orderCollection).aggregate([
        {
          $match: { userId: objectId(userId) }
        },
        {
          $sort: { date: -1 }
        },
        {
          $unwind: "$products"
        },
        {
          $lookup: {
            from: collection.productCollection,
            localField: "products.item",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        {
          $unwind: "$productDetails"
        },
        {
          $group: {
            _id: "$_id",
            orderId: { $first: "$_id" },
            totalAmount: { $first: "$totalAmount" },
            date: { $first: "$date" },
            status: { $first: "$status" },
            products: {
              $push: {
                name: "$productDetails.name",
                price: "$productDetails.price",
                image: "$productDetails._id", // adjust for your image logic
                quantity: "$products.quantity"
              }
            }
          }
        }
      ]).toArray();

      resolve(orders);
    } catch (err) {
      reject(err);
    }
  });
}





};
