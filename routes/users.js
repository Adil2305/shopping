var express = require("express");
var router = express.Router();
var db = require('../config/connection'); // ✅ Needed in every file that uses `db.get()`
const collection = require('../config/collection');

const productHelper = require("../helpers/product-helper");
const userHelper = require("../helpers/user-helper");
const { response } = require("../app");
const verifyLogin=(req,res,next)=>{
  if (req.session.loggedIn) {
    next()
  }else{
    res.redirect('/login')
  }
}


/* GET home page. */
//const productHelper = require('../helpers/product-helper'); // Make sure this is imported

router.get('/', verifyLogin, async (req, res) => {
  let user = req.session.user;
  let cartCount = 0;

  if (user) {
    cartCount = await userHelper.getCartCount(user._id);
  }

  let products = await productHelper.getAllProducts(); // ✅ You need this line

  res.render('users/view-products', {
    user,
    cartCount,
    products
  });
});



router.get("/login", (req, res) => {
  
  if (req.session.loggedIn) {
    res.redirect('/');
  } else {

    res.render('users/login',{"loginErr":req.session.loginErr});
    req.session.loginErr=false
  }

});
router.get("/signup", (req, res) => {
  res.render("users/signup");

});
router.post("/signup", (req, res) => {
  userHelper.doSignup(req.body).then((response) => {
    console.log(response);
    req.session.loggedIn=true
    req.session.user=response
    res.redirect('/')
  });
});
router.post("/login", (req, res) => {

  userHelper.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn =true;
      req.session.user = response.user;
      res.redirect("/");
    } else {
      req.session.loginErr="Invalid user name or password"
      res.redirect("/login");
    }
  });
});
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});
router.get('/cart',verifyLogin,async(req,res)=>{
  let products=await userHelper.getCartProduct(req.session.user._id)
 // console.log("Cart products:", products);
 let total= await userHelper.getTolalAmount(req.session.user._id)
  
  //console.log({products});
  
  res.render('users/cart', { products,total,'user':req.session.user})  
})
router.get('/add-to-cart/:id', verifyLogin, (req, res) => {
  userHelper.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true });
  });
});

router.post('/change-product-quantity/:id', (req, res, next) => {
  console.log("📥 Received quantity change:", req.body);
  userHelper.changeProQuantity(req.body).then(async (response) => {
    response.total = await userHelper.getTolalAmount(req.body.user);
    res.json(response);
  });
});

router.get('/order-details', verifyLogin, async(req,res)=>{

  let total= await userHelper.getTolalAmount(req.session.user._id)
  let user = req.session.user;

  res.render('users/order-details',{total,user})
})

router.post('/order-details', verifyLogin, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const objectId = require("mongodb").ObjectId;
    const products = await userHelper.getProductList(userId);
    const totalPrice = await userHelper.getTolalAmount(userId);

    const orderData = {
      ...req.body,
      userId
    };

    // 🛒 Check order placing
    await userHelper.placeOrder(orderData, products, totalPrice);
    console.log("✅ Order placed");

    // 🔍 Check cart delete
    const deleted = await db.get()
      .collection(collection.cartCollection)
      .deleteMany({ user: objectId(userId) });

    
    //res.json({ status: true });
    res.redirect('/order-success')
  } catch (err) {
    console.error("❌ Order placing failed:", err);
    res.status(500).json({ status: false, message: "Order failed" });
  }
});


// ✅ Order Success Page
router.get('/order-success', verifyLogin, (req, res) => {
      
    let userId = req.session.user._id;
  res.render('users/order-success', { user: req.session.user });
});


router.get('/order-history', verifyLogin, async (req, res) => {
  try {
      let user = req.session.user;
    let userId = req.session.user._id;
    let orders = await userHelper.getUserOrders(userId);

    // Format dates
    orders = orders.map(order => {
      return {
        ...order,
        date: new Date(order.date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      };
    });

    res.render('users/order-history', { orders,user });
  } catch (err) {
    console.error("Error fetching order history:", err);
    res.status(500).send("Internal Server Error");
  }
});

  

module.exports = router;
 