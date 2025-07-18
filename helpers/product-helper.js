var db = require("../config/connection");
var collection = require("../config/collection");
const { ObjectId } = require("mongodb");
const { response } = require("../app");
const objectId = ObjectId;

module.exports = {
  addProduct: (product, callback) => {
    console.log(product);
    db.get()
      .collection("product")
      .insertOne(product)
      .then((data) => {
        callback(data.ops[0]._id);
      });
  },
  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db.get().collection("product").find().toArray();
      resolve(products);
    });
  },
  deleteProduct: (proId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.productCollection)
        .deleteOne({ _id: ObjectId(proId) })
        .then((response) => {
          resolve(response);
        });
    });
  },
getProduct: (proId) => {
  return new Promise((resolve, reject) => {
    if (!ObjectId.isValid(proId)) {
      return reject("Invalid product ID");
    }

    db.get()
      .collection(collection.productCollection)
      .findOne({ _id: ObjectId(proId) })
      .then((product) => {
        resolve(product);
      })
      .catch((err) => {
        reject(err);
      });
  });
},

updateProduct: (proId, proDetails) => {
  return new Promise((resolve, reject) => {
    if (!ObjectId.isValid(proId)) {
      return reject("Invalid product ID");
    }

    db.get()
      .collection(collection.productCollection)
      .updateOne(
        { _id: ObjectId(proId) },
        {
          $set: {
            name: proDetails.name,
            description: proDetails.description,
            price: proDetails.price,
            category: proDetails.category,
          },
        }
      )
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject(err);
      });
  });
} 

};
