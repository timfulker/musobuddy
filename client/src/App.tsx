import { Route, Router } from 'wouter';
import Dashboard from './pages/Dashboard';
import Enquiries from './pages/Enquiries';
import Contracts from './pages/Contracts';
import Invoices from './pages/Invoices';
import Bookings from './pages/Bookings';
import Compliance from './pages/Compliance';
import Navigation from './components/Navigation';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-8">
          <Route path="/" component={Dashboard} />
          <Route path="/enquiries" component={Enquiries} />
          <Route path="/contracts" component={Contracts} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/bookings" component={Bookings} />
          <Route path="/compliance" component={Compliance} />
        </main>
      </div>
    </Router>
  );
}

export default App;