import { NextResponse } from 'next/server';

const rooms = [
  { id: 'loneliness-isolation', mood: 'Loneliness & Isolation' },
  { id: 'relationships-dating', mood: 'Relationships & Dating' },
  { id: 'career-work-life', mood: 'Career & Work Life' },
  { id: 'anxiety-stress', mood: 'Anxiety & Stress' },
  { id: 'self-discovery', mood: 'Self-Discovery' },
  { id: 'hobbies-interests', mood: 'Hobbies & Interests' },
  { id: 'life-transitions', mood: 'Life Transitions' },
  { id: 'need-to-vent', mood: 'Need to Vent' },
  { id: 'celebrating-good-news', mood: 'Celebrating Good News' },
  { id: 'deep-conversations', mood: 'Deep Conversations' },
  { id: 'health-wellness', mood: 'Health & Wellness' },
  { id: 'family-parenting', mood: 'Family & Parenting' },
];

export async function GET(req: Request, { params }: { params: { roomId: string } }) {
  const room = rooms.find((r) => r.id === params.roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  return NextResponse.json(room);
}