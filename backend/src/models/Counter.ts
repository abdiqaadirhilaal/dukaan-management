import { Schema, model } from 'mongoose';

// Atomic sequence generator (used for receipt numbers). Works on a standalone MongoDB, no transactions needed.
const counterSchema = new Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

const Counter = model('Counter', counterSchema);

export async function nextSequence(name: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return doc!.seq;
}
