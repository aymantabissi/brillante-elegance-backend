import mongoose from 'mongoose'

const chatReadSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    room: {
      type: String,
      enum: ['team', 'creators'],
      required: true,
    },

    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

chatReadSchema.index({ user: 1, room: 1 }, { unique: true })

const ChatRead = mongoose.model('ChatRead', chatReadSchema)

export default ChatRead
