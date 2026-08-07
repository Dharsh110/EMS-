"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const Task_1 = __importDefault(require("../models/Task"));
const Employee_1 = __importDefault(require("../models/Employee"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
async function run() {
    await mongoose_1.default.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    const tasks = await Task_1.default.find({ $or: [{ department: { $exists: false } }, { department: null }] });
    console.log(`Found ${tasks.length} tasks with no department`);
    let fixed = 0;
    for (const task of tasks) {
        if (!task.assignedTo)
            continue;
        const employee = await Employee_1.default.findById(task.assignedTo).select('department');
        if (employee?.department) {
            task.department = employee.department;
            await task.save();
            fixed++;
        }
    }
    console.log(`Backfilled department on ${fixed} task(s)`);
    await mongoose_1.default.disconnect();
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
