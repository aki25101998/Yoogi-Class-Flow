import VenueDetailsClient from './VenueDetailsClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chi tiết Địa điểm - Yoogi',
};

export default function VenueDetailsPage({ params }: { params: { venueId: string } }) {
  return <VenueDetailsClient venueId={params.venueId} />;
}
