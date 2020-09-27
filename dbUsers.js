import mongoose from 'mongoose'

const userSchema = mongoose.Schema({
    appPhoneNumber: String,
    displayName: String,
    email: String,
    avatar: String,
})

const chatSchema = mongoose.Schema({
    participants: [
        {
            sender: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            receiver: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        }
    ]
})

const messageSchema = mongoose.Schema({
    authors: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat'
    },
    messages: [
        {
            message: String,
            sentBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            timestamp: String,
        }
    ]
})

export const User = mongoose.model('User', userSchema)
export const Chat = mongoose.model('Chat', chatSchema)
export const Message = mongoose.model('Message', messageSchema)
