import { data } from 'react-router';

export const clientLoader = () => {
  throw data(null, { status: 404 });
};

export default function NotFound() {
  return null;
}
