import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { ROLES, Role, User } from '../models/User';

async function main() {
  const [username, password, role = 'cashier', ...nameParts] = process.argv.slice(2);
  const usage = 'Usage: npm run create-user -- <username> <password> <admin|cashier> "<Full Name>"';

  if (!username || !password) throw new Error(usage);
  if (!ROLES.includes(role as Role)) throw new Error(`Role must be one of: ${ROLES.join(', ')}`);
  if (password.length < 8) throw new Error('Password must be at least 8 characters');

  await connectDB();

  if (await User.exists({ username: username.toLowerCase() })) {
    console.log(`User "${username}" already exists. Nothing was changed.`);
  } else {
    await User.create({ username, password, role, fullName: nameParts.join(' ') || username });
    console.log(`Created ${role} user "${username}".`);
  }
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
