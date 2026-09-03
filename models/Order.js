import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema(
  {
    // =========================
    // CLIENT
    // =========================
    client: {
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        default: '',
      },
    },

    // =========================
    // ARTICLES
    // =========================
    items: [
      {
        productId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        qty: {
          type: Number,
          required: true,
          min: 1,
        },
        image: {
          type: String,
          default: '',
        },
      },
    ],

    // =========================
    // TOTAL
    // =========================
    total: {
      type: Number,
      required: true,
    },

    // =========================
    // PAYMENT STATUS
    // =========================
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
    },

    // =========================
    // CONFIRMATION (appel client avant traitement)
    // =========================
    orderConfirmed: {
      type: Boolean,
      default: true,
    },

    // =========================
    // ORDER PROCESSING STATUS
    // =========================
    orderStatus: {
      type: String,
      enum: [
        'not_processed',
        'not_required',
        'shipping',
        'delivered',
      ],
      default: 'not_processed',
    },

    // =========================
    // DELIVERY METHOD
    // =========================
    deliveryMethod: {
      type: String,
      enum: [
        'safi_10dh',
        'outside_safi_35dh',
        'national_20dh',
      ],
      default: 'national_20dh',
    },

    // =========================
    // NOTE
    // =========================
    note: {
      type: String,
      default: '',
    },

    // =========================
    // AFFILIATION (creator)
    // =========================
    promoCode: {
      type: String,
      default: '',
    },

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    commissionAmount: {
      type: Number,
      default: 0,
    },

    commissionCredited: {
      type: Boolean,
      default: false,
    },

    // =========================
    // COLISSPEED
    // =========================
    colisSpeed: {
      tracking: {
        type: String,
        default: '',
      },

      status: {
        type: String,
        default: '',
      },

      paymentStatus: {
        type: String,
        default: '',
      },

      deliveryPerson: {
        name: {
          type: String,
          default: '',
        },

        phone: {
          type: String,
          default: '',
        },
      },

      lastUpdate: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
)

const Order = mongoose.model('Order', orderSchema)

export default Order