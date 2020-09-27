import express from 'express'
import mongoose from 'mongoose'
import Pusher from 'pusher'
import Messages from './dbMessages.js'
// import Users from './dbUsers.js'
import { User, Chat, Message } from './dbUsers.js'

//app configuration
const app = express()
const port = process.env.PORT || 5000;

//middlewares
app.use(express.json())

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    next();
})

// if (process.env.NODE_ENV === 'production') {
//     app.use(express.static(path.join(__dirname, 'client/build')))
//     app.get('*', function(req, res) {
//         res.sendFile(path.join(__dirname, 'client/build', 'index.html'))
//     })
// }


//routes
app.get('/', (req, res) => {
    console.log('YKTV')
    res.status(200).send('hello world')
})

app.post('/register', (req, res) => {
    const dbRegister = req.body
    User.findOne({email: dbRegister.email})
    .then(user => {
        if (!user) {
            User.create(dbRegister, (error, data) => {
                if (error) {
                    res.status(500).send(error)
                } else {
                    res.status(201).send(data)
                }
            })
        } else {
            User.find({email: dbRegister.email}, (error, data) => {
                if (error) {
                    res.status(500).send(error)
                } else {
                    res.status(201).send(data[0])
                }
            })
        }
    })
})


app.post('/chat', async (req, res) => {
    const dbChat = req.body
    const datum = []
    console.log("beforechange", dbChat)
    const Receiver = await User.find({appPhoneNumber: dbChat.participants[1].receiver}).exec()
    .then(result => result[0])
    .catch(error => error)

    if (!Receiver) {
        res.status(200).send("i don't know this person")
        return
    }
    dbChat.participants[1].receiver = Receiver._id
    const findway1 = await Chat.find({'participants.sender': dbChat.participants[0].sender, 'participants.receiver': dbChat.participants[1].receiver }).exec()
    .then(result => {
        if (result[0]) {
            return true
        } else {
            return false
        }
    })
    .catch(error => error)

    const findway2 = await Chat.find({'participants.sender': dbChat.participants[1].receiver, 'participants.receiver': dbChat.participants[0].sender }).exec()
    .then(result => {
        if (result[0]) {
            return true
        } else {
            return false
        }
    })
    .catch(error => error)

    if (findway1 || findway2) {
        res.status(201).send("convo exists")
    } else {
        Chat.create(dbChat, (error, data) => {
            console.log("afterchange", dbChat)
            if (error) {
                res.status(500).send(error)
                return
            } else {
                datum.push(data)
            }
            const messageAuthors = {
                authors: data._id,
                messages: []
            }
            Message.create(messageAuthors, (error, data) => {
                if (error) {
                    res.status(500).send(error)
                } else {
                    datum.push(data)
                }               
                res.status(201).send(datum)
            })
        })
    }
})


app.post('/contacts', (req, res) => {
    const criteria = req.body
    Chat.find({$or: [ {'participants.sender': criteria.user}, {'participants.receiver': criteria.user}] }, (error, data) => {
    // Chat.find({'participants.receiver': criteria.user}, (error, data) => {
        if (error) {
            res.status(500).send(error)
        } else {
            const finalResponse = data.map(async dat => {
                const idOfSender = dat.participants[0].sender;
                const idOfReceiver = dat.participants[1].receiver;
                
                const detailsOfSender = await User.findById(idOfSender).exec()
                .then(data => data)
                .catch(error => res.status(500).send(error))
                
                const detailsOfReceiver = await User.findById(idOfReceiver).exec()
                .then(data => data)
                .catch(error => res.status(500).send(error))
                return {
                    _id: dat._id,
                    participants: [
                        {
                            _id: dat.participants[0]._id,
                            sender: detailsOfSender
                        },
                        {
                            _id: dat.participants[1]._id,
                            receiver: detailsOfReceiver
                        }
                    ]
                }
            })
            Promise.all(finalResponse).then(resp => {
                res.status(201).send(resp)
            })
        }       
    })
})

app.post('/contacts/contactId/:contactId', (req, res) => {
    const author = req.body
    Message.find({authors: author.ath}, async (error, data) => {
        if (error) {
            res.status(500).send("err", error)
        } else {
            const Authors = await Chat.find({_id: author.ath}).exec()
            .then(async data => {
                const theData = data[0]
                const theSender = theData.participants[0].sender
                const theReceiver = theData.participants[1].receiver
                const authorNames = await User.find({$or: [ {_id: theSender}, {_id: theReceiver}] }).exec()
                .then(result => result)
                .catch(error => error)
                
                return authorNames
            })
            .catch(error => error)
            const ans = {
                _id: data[0]._id,
                authors: Authors,
                messages: data[0].messages
            }
            // console.log(ans)
            res.status(201).send(ans)
        }
    })
})

app.put('/chat/id/:id', (req, res) => {
    const dbMessage = req.body
    
    Message.findByIdAndUpdate(
        {_id: dbMessage.id},
        {$push: {"messages": {
           message: dbMessage.message,
           sentBy: dbMessage.sender,
           timestamp: dbMessage.timestamp 
        }}},
        {new: true},
        (error, data) => {
            if (error) {
                res.status(500).send(error)
            } else {
                res.status(201).send(data)
            }
        }
    )
})

// app.get('/messages/sync', (req, res) => {
//     Messages.find((error, data) => {
//         if (error) {
//             res.status(500).send(error)
//         } else {
//             res.status(200).send(data)
//         }
//     })
// })

//DATABASE config
const mongodb_connection_url = 'mongodb+srv://admin:kRYqlnA1Iz5oE1Ud@cluster0.kl9ix.mongodb.net/whatsappMDB?retryWrites=true&w=majority'
mongoose.connect(mongodb_connection_url, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const pusher = new Pusher({
    appId: '1078994',
    key: '32f57dadcb8ff9637c3c',
    secret: '0f2c30d199195ee83ade',
    cluster: 'eu',
    encrypted: true
});

const db = mongoose.connection
db.once('open', () => {
    console.log('DB is connected')
    
    // const msgCollection = db.collection("messagecontents");
    // const changeStream = msgCollection.watch()
    const changeStream = Messages.watch()
    const changeChat = Message.watch({fullDocument: 'updateLookup'})
    

    changeStream.on('change', (change) => {
        console.log(change)
        if (change.operationType === 'insert') {
            const messageDetails = change.fullDocument;
            pusher.trigger('messages', 'inserted', {
                _id: messageDetails._id,
                name: messageDetails.name,
                message: messageDetails.message,
                timestamp: messageDetails.timestamp,
                received: messageDetails.received
            })
        } else {
            console.log("Error triggering pusher.")
        }
    })

    changeChat.on('change', (change) => {
        console.log({change})

        if (change.operationType === 'update') {
            const messageDetails = change.fullDocument;
            console.log({messageDetails})
            const chat = messageDetails.messages.slice(-1)[0]
            console.log({chat})
            pusher.trigger('chats', 'updated', {
                _id: chat._id,
                sentBy: chat.sentBy,
                message: chat.message,
                timestamp: chat.timestamp,
            })
        } else {
            console.log("Error triggering pusher.")
        }
    })


})



app.listen(port, () => console.log(`app is running on localhost:${port}`))