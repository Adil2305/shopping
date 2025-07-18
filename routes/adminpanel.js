var express = require("express");
const productHelper = require("../helpers/product-helper");
const { response } = require("../app");
var router = express.Router();

/* GET users listing. */
router.get("/", function (req, res, next) {
  productHelper.getAllProducts().then((products) => {
    res.render("admin/view-products", { admin: true, products });
  });           
});
router.get("/add-products", function (req, res) {
  res.render("admin/add-products");  
});

router.post("/add-products", (req, res) => {
  productHelper.addProduct(req.body, (id) => {
    let image = req.files.image;
    image.mv("./public/product-images/" + id + ".jpg", (err, done) => {
      if (!err) {
        res.render("admin/add-products");
      } else {
        console.log(err);
      }
    });
    res.render("admin/add-products");
  });
});
router.get("/delete-product/:id", (req, res) => {
  let prId = req.params.id;
  productHelper.deleteProduct(prId).then((response) => {
     console.log("Delete ID:", req.params.id);
    res.redirect("/admin/");
  });
});

router.get("/edit-product/:id", async (req, res) => {
  try {
    const prId = req.params.id;
    console.log("Edit Product ID:", prId);
    
    const product = await productHelper.getProduct(prId);
    
    if (!product) {
      console.error("Product not found");
      return res.redirect("/admin");
    }

    res.render("admin/edit-product", { product });
  } catch (err) {
    console.error("Error in /edit-product/:id", err);
    res.redirect("/admin");
  }
});

router.post("/edit-product/:id", (req, res) => {
  const id = req.params.id.trim(); // always good to trim

  productHelper.updateProduct(id, req.body).then(() => {
    res.redirect("/admin");
    let image=req.files.image
        image.mv("./public/product-images/" + id + ".jpg",)
  }).catch((err) => {
    console.error("Update error:", err);
    res.redirect("/admin");
    if (req.files.image) {

    
    } else {
      
    }
  });
});

module.exports = router;  
