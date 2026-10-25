import { connectDatabase } from './backend/config/database.js';
import './backend/models/User.js';
import Meeting from './backend/models/Meeting.js';

await connectDatabase();

const result = await Meeting.updateOne(
  { roomId: '6qV0CVIEnONRqv4v' },
  {
    $set: {
      invitedViewer: '6ad996b398b8c17ae00b5d45',
      invitedUsers: ['6ad996b398b8c17ae00b5d45'],
    },
  }
);
console.log('Updated:', JSON.stringify(result));

const m = await Meeting.findOne({ roomId: '6qV0CVIEnONRqv4v' })
  .populate('host', 'name username _id')
  .populate('invitedUsers', 'name username _id')
  .populate('invitedViewer', 'name username _id');

console.log(JSON.stringify({
  host: m.host,
  invitedUsers: m.invitedUsers,
  invitedViewer: m.invitedViewer,
}, null, 2));

process.exit(0);
