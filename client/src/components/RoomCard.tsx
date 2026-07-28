import { Link } from 'react-router-dom';
import type { RoomWithStatus } from '../api/types';
import { amenityIcon, amenityLabel } from '../lib/amenities';
import { formatTime } from '../lib/format';

export function RoomCard({ room }: { room: RoomWithStatus }) {
  return (
    <Link
      to={`/rooms/${room.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-36 overflow-hidden bg-slate-100">
        {room.imageUrl ? (
          <img
            src={room.imageUrl}
            alt={room.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🏢</div>
        )}
        <StatusBadge busy={room.busy} />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold">{room.name}</h3>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            Floor {room.floor}
          </span>
        </div>

        <p className="mt-0.5 text-sm text-slate-500">
          👥 {room.capacity} seats
          {room.location ? ` · ${room.location}` : ''}
        </p>

        {room.amenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {room.amenities.map((a) => (
              <span
                key={a}
                title={amenityLabel(a)}
                className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600"
              >
                <span>{amenityIcon(a)}</span>
                {amenityLabel(a)}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 text-sm">
          {room.busy && room.currentBooking ? (
            <p className="text-red-600">
              Busy until {formatTime(room.currentBooking.endTime)} ·{' '}
              <span className="text-slate-500">{room.currentBooking.title}</span>
            </p>
          ) : (
            <p className="font-medium text-emerald-600">Available now</p>
          )}
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ busy }: { busy: boolean }) {
  return (
    <span
      className={[
        'absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm',
        busy ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white',
      ].join(' ')}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white" />
      {busy ? 'Busy' : 'Free'}
    </span>
  );
}
