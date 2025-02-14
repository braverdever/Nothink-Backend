import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Invite } from '../entities/invite';
import { Model } from 'mongoose';
import { ObjectId } from 'bson';

@Injectable()
export class InviteService {
  constructor(
    @InjectModel(Invite.name) private readonly inviteModel: Model<Invite>,
  ) {}

  getCollection() {
    return this.inviteModel.collection;
  }

  findInviteLink(userId: string) {
    return this.inviteModel.findOne({ from: userId });
  }

  async createInviteLink(userId: string) {
    const invite = await this.findInviteLink(userId);
    if (!invite)
      return new this.inviteModel({
        from: userId,
        accepted_by: [],
      }).save();
    return invite;
  }

  async getInvited(userId: string): Promise<string[]> {
    const invite = await this.inviteModel.findOne({ from: userId });
    const inviter = await this.inviteModel.findOne({
      accepted_by: new ObjectId(userId),
    });
    console.log(inviter);
    return [
      ...(invite?.accepted_by || []).map((id) => id.toString()),
      userId,
      inviter?.from.toString(),
    ];
  }

  async isInvited(userId: string): Promise<boolean> {
    const invite = this.inviteModel.findOne({ accepted_by: userId });
    return Boolean(invite);
  }
  async acceptInvite(userId: string, inviteId: string) {
    const alreadyAccepted = await this.inviteModel.findOne({
      accepted_by: userId,
    });
    if (alreadyAccepted) throw new Error('Cannot accept twice');
    const invite = await this.inviteModel.findOne({
      _id: inviteId,
    });
    if (!invite) throw new Error('Invite not found');
    if (userId === invite.from.toString())
      throw new Error('Cannot invite your self');
    invite.accepted_by.push(userId);
    return invite.save();
  }
  async getUserIdByInviteId(inviteId: string) {
    const invite = await this.inviteModel.findById(inviteId);
    if (!invite) throw new Error('Invite not found');
    return invite.from;
  }

  async claim(userId: string) {
    const accepter = await this.inviteModel.findOne({ accepted_by: userId });
    const invite = await this.inviteModel.findOne({ from: userId });
    if (!invite) return 0;
    const acceptedReduce = accepter ? 1 : 0;
    const diff =
      invite.accepted_by.length + acceptedReduce - (invite.claimed || 0);
    invite.claimed = invite.accepted_by.length + acceptedReduce;
    await invite.save();
    return diff;
  }
}
