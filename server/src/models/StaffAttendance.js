import mongoose from "mongoose";

const staffAttendanceSchema = new mongoose.Schema(
  {
    staffName: { type: String, required: true, trim: true },
    pin: { type: String, required: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date, default: null },
    breakStart: { type: Date, default: null },
    breakEnd: { type: Date, default: null },
    breakMinutes: { type: Number, default: 0 },
    totalMinutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Clocked In", "On Break", "Clocked Out"],
      default: "Clocked In",
    },
    late: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("StaffAttendance", staffAttendanceSchema);