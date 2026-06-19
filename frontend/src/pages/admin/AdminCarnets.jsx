import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Toaster } from "sonner";
import CarnetSheet from "../../components/CarnetSheet";

export default function AdminCarnets() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  const load = () => {
    Promise.all([
      api.get("/players"),
      api.get("/teams"),
      api.get("/clubs").catch(() => ({ data: [] })),
      api.get("/tournaments").catch(() => ({ data: [] })),
    ]).then(([p, t, c, tn]) => {
      setPlayers(p.data || []);
      setTeams(t.data || []);
      setClubs(c.data || []);
      setTournaments((tn.data || []).filter((x) => !x.archived));
    });
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div data-testid="admin-carnets">
      <Toaster position="top-right" />
      <CarnetSheet
        players={players}
        teams={teams}
        clubs={clubs}
        tournaments={tournaments}
        title="Carnets"
        testIdPrefix="carnet"
        showClubFilter={true}
        onRefresh={load}
      />
    </div>
  );
}
