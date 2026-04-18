import User from '../models/User';
import { IUser } from '../types';

export const userRepository = {
  async findByEmail(email: string): Promise<IUser | null> {
    return (await User.findOne({ email }).hint({ email: 1 })) as unknown as IUser;
  },

  async findById(id: string): Promise<IUser | null> {
    return (await User.findById(id)) as unknown as IUser;
  },

  async create(data: { email: string; name: string; passwordHash: string }): Promise<IUser> {
    const user = new User({ email: data.email, name: data.name, password: data.passwordHash });
    await user.save();
    return user as unknown as IUser;
  }
};
