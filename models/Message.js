import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    // 'team' = admin + managers, 'creators' = admin + creators
    room: {
      type: String,
      enum: ['team', 'creators'],
      default: 'team',
    },

    // Piece jointe optionnelle (image ou pdf)
    fileUrl: {
      type: String,
      default: '',
    },

    fileType: {
      type: String,
      enum: ['image', 'pdf', ''],
      default: '',
    },

    fileName: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

const Message = mongoose.model('Message', messageSchema)

export default Message
