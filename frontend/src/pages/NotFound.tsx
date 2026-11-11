import { Link } from 'react-router';
import { Empty } from '../components/ui';

export default function NotFound() {
  return (
    <Empty emoji="🧭" title="This page isn't in the notebook">
      <p>The link may be old or mistyped.</p>
      <Link to="/" className="btn sm" style={{ marginTop: 12 }}>
        Go to home
      </Link>
    </Empty>
  );
}
