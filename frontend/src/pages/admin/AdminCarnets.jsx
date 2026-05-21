import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Toaster } from "sonner";
import CarnetSheet from "../../components/CarnetSheet";

export default function AdminCarnets() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/players?status=aprobado"), api.get("/teams?status=aprobado")])
      .then(([p, t]) => { setPlayers(p.data); setTeams(t.data); })
      .catch(() => {
        Promise.all([api.get("/players"), api.get("/teams")]).then(([p, t]) => { setPlayers(p.data); setTeams(t.data); });
      });
  }, []);

  return (
    <div data-testid="admin-carnets">
      <Toaster position="top-right" />
      <CarnetSheet players={players} teams={teams} title="Carnets" testIdPrefix="carnet" />
    </div>
  );
}
