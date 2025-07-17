import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

const ADMIN_USER_ID = "your-admin-user-id"; // Replace this with your actual Replit user ID

const AdminPanel = () => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const router = useRouter();

  useEffect(() => {
    axios.get("/api/me").then((res) => {
      setUser(res.data);
      if (res.data.id !== ADMIN_USER_ID) {
        router.push("/unauthorized");
      }
    });

    axios.get("/api/admin/users").then((res) => setUsers(res.data));
    axios.get("/api/admin/bookings").then((res) => setBookings(res.data));
  }, []);

  if (!user || user.id !== ADMIN_USER_ID) return <p>Loading...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Admin Dashboard</h1>

      <section>
        <h2>👤 Users</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Tier</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.tier}</td>
                <td>
                  <button onClick={() => promoteUser(u.id)}>Promote</button>
                  <button onClick={() => deleteUser(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>📆 Recent Bookings</h2>
        <ul>
          {bookings.map((b) => (
            <li key={b.id}>
              {b.clientName} - {b.date} - {b.serviceType}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

function promoteUser(userId) {
  axios.post("/api/admin/promote", { userId }).then(() => {
    alert("User promoted");
    window.location.reload();
  });
}

function deleteUser(userId) {
  if (confirm("Are you sure?")) {
    axios.post("/api/admin/delete", { userId }).then(() => {
      alert("User deleted");
      window.location.reload();
    });
  }
}

export default AdminPanel;
