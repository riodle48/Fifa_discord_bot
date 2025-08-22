const mongoose = require("mongoose");
module.exports = async (client) => {
  await mongoose.connect(process.env.MONGO_URI);

  console.log(`${client.user.tag} is online.`);
  console.log("MongoDB connected successfully");
};
