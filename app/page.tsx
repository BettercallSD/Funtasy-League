import { redirect } from "next/navigation";
import { DEFAULT_LEAGUE_SLUG } from "@/lib/leagues";

export default function Home() {
  redirect(`/leagues/${DEFAULT_LEAGUE_SLUG}`);
}
