import { redirect } from 'next/navigation';

export default function Home() {
  // Authenticated users land on the dashboard; middleware bounces the rest to /login.
  redirect('/dashboard');
}
