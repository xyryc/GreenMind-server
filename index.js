require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const nodemailer = require("nodemailer");

const port = process.env.PORT || 9000;
const app = express();

// middleware
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;

    next();
  });
};

// send email using nodemailer
const sendEmail = (emailAddress, emailData) => {
  // const emailData = {
  //   subject: "This is very important subject",
  //   message: "Nice Message.",
  // };

  // create transporter
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASS,
    },
  });

  // verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Transporter is ready to send email", success);
    }
  });

  // mail body
  const mailBody = {
    from: process.env.NODEMAILER_USER, // sender address
    to: emailAddress, // list of receivers
    subject: emailData?.subject, // Subject line

    html: `
     <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h1 style="color: #4CAF50;">Message from PlantNet</h1>
        <p>Hi there,</p>
        <p>${emailData?.message}</p>
        <p>Feel free to explore our platform and let us know if you have any questions.</p>
        <p>Best regards,</p>
        <p><strong>PlantNet Inc, Bangladesh</strong></p>
        <footer style="margin-top: 20px; font-size: 12px; color: #777;">
          <p>This email was sent by PlantNet.</p>
          <p>34 Red Street, Dinajpur City 5200, Bangladesh</p>
        </footer>
      </div>
      `, // html body
  };

  // send email
  transporter.sendMail(mailBody, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      // console.log(info);
      console.log("Email sent:", +info?.response);
    }
  });
};

const uri = `mongodb://localhost:27017/`;
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t08r2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    const db = client.db("plantNetDB");
    const usersCollection = db.collection("users");
    const plantsCollection = db.collection("plants");
    const ordersCollection = db.collection("orders");

    // verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.user?.email;
      const query = { email };
      const result = await usersCollection.findOne(query);
      if (!result || result?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden access!" });
      }
      next();
    };

    // verify seller middleware
    const verifySeller = async (req, res, next) => {
      const email = req.user?.email;
      const query = { email };
      const result = await usersCollection.findOne(query);
      if (!result || result?.role !== "seller") {
        return res.status(403).send({ message: "Forbidden access!" });
      }
      next();
    };

    // ** public **
    // Generate jwt token
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Logout
    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
      } catch (err) {
        res.status(500).send(err);
      }
    });

    // get all plants from db
    app.get("/plants", async (req, res) => {
      const result = await plantsCollection.find().toArray();
      res.send(result);
    });

    // get a plant by id
    app.get("/plants/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await plantsCollection.findOne(query);
      res.send(result);
    });

    // save order data in db
    app.post("/orders", verifyToken, async (req, res) => {
      const orderInfo = req.body;
      const result = await ordersCollection.insertOne(orderInfo);

      // send email on successful order
      if (result.insertedId) {
        // to customer
        sendEmail(orderInfo?.customer?.email, {
          subject: "Order Successful",
          message: `You've placed an order successfully. Transaction Id: ${result?.insertedId}`,
        });

        // to seller
        sendEmail(orderInfo?.seller, {
          subject: "Hurray!, You've an order to process",
          message: `Get the plants ready for ${orderInfo?.customer?.name}`,
        });
      }

      res.send(result);
    });

    // get all orders for a specific customer
    app.get("/customer-orders/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { "customer.email": email };

      const result = await ordersCollection
        .aggregate([
          {
            $match: query, // match by email in orders collection
          },
          {
            $addFields: {
              plantId: { $toObjectId: "$plantId" }, // convert plantId string field of orders collection in ObjectId
            },
          },
          {
            $lookup: {
              // go to different collection and look for data
              from: "plants", // collection name
              localField: "plantId", //local data u want to match from orders collection
              foreignField: "_id", // foreign data u want to compare, in this case in plant collection
              as: "plants", // return the matched data as "plants" array
            },
          },
          {
            $unwind: "$plants", // return the "plants" array as object property, not array
          },
          {
            $addFields: {
              // only get the fields from "plants" array and add to the object property
              name: "$plants.name",
              category: "$plants.category",
              image: "$plants.image",
            },
          },
          {
            // remove the "plants" object property from order object
            $project: {
              plants: 0,
            },
          },
        ])
        .toArray();

      res.send(result);
    });

    // cancel/ delete a order
    app.delete("/orders/delete/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const order = await ordersCollection.findOne(query);
      if (order.status === "Delivered")
        return res
          .status(409)
          .send("Can't cancel once the product is delivered!");
      const result = ordersCollection.deleteOne(query);
      res.send(result);
    });

    // manage plant quantity/ +/- product count on cancel or order
    app.patch("/plants/quantity/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { quantityToUpdate, status } = req.body;
      const filter = { _id: new ObjectId(id) };
      let updatedDoc = {
        $inc: { quantity: -quantityToUpdate },
      };
      if (status === "increase") {
        updatedDoc = {
          $inc: { quantity: quantityToUpdate },
        };
      }

      const result = await plantsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // save or update a user in db
    app.post("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = req.body;

      // check if user exists in db
      const isExist = await usersCollection.findOne(query);
      if (isExist) {
        return res.send(isExist);
      }

      const result = await usersCollection.insertOne({
        ...user,
        role: "customer",
        timestamp: Date.now(),
      });
      res.send(result);
    });

    //  request to become a seller/ manage user status and role
    app.patch("/users/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      if (!user || user?.status === "Requested")
        return res
          .status(400)
          .send(
            "You have already requested to become a seller, Wait for the admin to accept the request."
          );

      const updatedDoc = {
        $set: {
          status: "Requested",
        },
      };

      const result = await usersCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // get user role
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await usersCollection.findOne(query);
      res.send({ role: result?.role });
    });

    // ** seller **
    // save a plant data in db
    app.post("/plants", verifyToken, verifySeller, async (req, res) => {
      const plant = req.body;
      const result = await plantsCollection.insertOne(plant);
      res.send(result);
    });

    // get inventory data for seller
    app.get("/seller-plants", verifyToken, verifySeller, async (req, res) => {
      const email = req?.user?.email;

      const result = await plantsCollection
        .find({ "seller.email": email })
        .toArray();
      res.send(result);
    });

    app.delete("/plants/:id", verifyToken, verifySeller, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await plantsCollection.deleteOne(query);
      res.send(result);
    });

    // get all orders for a specific seller
    app.get(
      "/seller-orders/:email",
      verifyToken,
      verifySeller,
      async (req, res) => {
        const email = req.params.email;
        const query = { seller: email };

        const result = await ordersCollection
          .aggregate([
            {
              $match: query, // match by email in orders collection
            },
            {
              $addFields: {
                plantId: { $toObjectId: "$plantId" }, // convert plantId string field of orders collection in ObjectId
              },
            },
            {
              $lookup: {
                // go to different collection and look for data
                from: "plants", // collection name
                localField: "plantId", //local data u want to match from orders collection
                foreignField: "_id", // foreign data u want to compare, in this case in plant collection
                as: "plants", // return the matched data as "plants" array
              },
            },
            {
              $unwind: "$plants", // return the "plants" array as object property, not array
            },
            {
              $addFields: {
                // only get the fields from "plants" array and add to the object property
                name: "$plants.name",
              },
            },
            {
              // remove the "plants" object property from order object
              $project: {
                plants: 0,
              },
            },
          ])
          .toArray();

        res.send(result);
      }
    );

    // update a order status
    app.patch("/orders/:id", verifyToken, verifySeller, async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };

      const updatedDoc = {
        $set: {
          status,
        },
      };

      const result = await ordersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // ** admin **
    // get all user data
    app.get("/all-users/:email", verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const query = { email: { $ne: email } };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // update a user role and status
    app.patch(
      "/user/role/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const filter = { email };

        const updatedDoc = {
          $set: {
            role: req.body.role,
            status: "Verified",
          },
        };

        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    // admin stats
    app.get("/admin-stat", verifyToken, verifyAdmin, async (req, res) => {
      // get total user, total plants
      // const totalUser = await usersCollection.countDocuments({role: "admin"});    //this method is used for filtering and counting
      const totalUser = await usersCollection.estimatedDocumentCount();
      const totalPlants = await plantsCollection.estimatedDocumentCount();

      // not best way
      // const allOrder = await ordersCollection.find().toArray();
      // const totalOrders = allOrder.length;
      // const totalPrice = allOrder.reduce((sum, order) => sum + order.price, 0);

      // const myData = [
      //   {
      //     date: "11/01/2025",
      //     quantity: 4000,
      //     price: 2400,
      //     order: 2400,
      //   },
      // ];
      // generate chart data
      const chartData = await ordersCollection
        .aggregate([
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: { $toDate: "$_id" },
                },
              },
              quantity: {
                $sum: "$quantity",
              },
              price: { $sum: "$price" },
              order: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              date: "$_id",
              quantity: 1,
              order: 1,
              price: 1,
            },
          },
        ])
        .next();

      // get total revenue, total order
      const orderDetails = await ordersCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$price" },
              totalOrder: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
            },
          },
        ])
        .next();

      res.send({
        totalUser,
        totalPlants,
        ...orderDetails,
        chartData: [chartData],
      });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from plantNet Server..");
});

app.listen(port, () => {
  console.log(`plantNet is running on port ${port}`);
});
