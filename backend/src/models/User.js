import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["customer", "owner", "admin", "delivery_partner"],
      default: "customer",
    },
    phone: String,
    avatar: String,
    address: String,
    city: String,
    // Multiple saved delivery addresses (label + full line)
    addresses: [
      {
        label: { type: String, default: "Home" },
        line: { type: String, required: true },
        city: String,
        zip: String,
        phone: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    isActive: { type: Boolean, default: true },
    // Delivery partner fields
    isDeliveryPartner: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    currentLocation: {
      type: {
        lat: { type: Number },
        lng: { type: Number },
      },
      default: null,
    },
    // OTP login — otpCode stores a bcrypt hash (never the plaintext code)
    otpCode: String,
    otpExpiresAt: Date,
    otpAttempts: { type: Number, default: 0 }, // failed verifications for the current code
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to return user without sensitive fields
userSchema.methods.toJSON = function () {
  const { password, otpCode, otpExpiresAt, otpAttempts, ...rest } = this.toObject();
  return rest;
};

userSchema.index({ phone: 1 }, { unique: true, sparse: true });

export default mongoose.model("User", userSchema);

// Defense-in-depth: never include the password hash in JSON output (res.json or
// populated sub-documents). Login is unaffected — bcrypt compares in memory.
userSchema.set("toJSON", {
  transform: function (_doc, ret) {
    delete ret.password;
    return ret;
  },
});
