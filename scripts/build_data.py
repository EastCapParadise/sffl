import pandas as pd
import json
import requests
from pathlib import Path

# ============================================================
# CONFIG
# ============================================================
EXCEL_PATH = Path(__file__).parent.parent / "data" / "SFFL_Historical_Stats_Nov_2025.xlsx"
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "data.json"
ESPN_LEAGUE_ID = 820785
ESPN_S2 = "AEAECCPtpF%2FohJvEMDWI42NUdMVpw6BGUPdQ47fGLqRcgu7t%2FWAuRb3fRZvvqNDKSA7qswqnjF5%2F9VoWcIEodu1WTyOdLJLMqOJna%2BQUCfEfLxl7fzVF8s5Cg7BF0bbbvYuJRLNUmmqMvAdqRL0IHedjhGu3h0%2FgjGFB0UZky4mVft6FM%2BRzzy8uUZlPStK%2FG%2BYuPUwhoqmaX36LBbs4PhOrvHqwiPVlThhndimH0Ay9V4g36371gvZL%2FipK1U8g16BdQh%2FCmdV2JzdesmzEHDpTrlYTBTQ7ctlEOWt2gcXKCBNsCW3DWaneo2%2BiIu2CnyY%3D"
SWID = "{04AC0CA0-B885-49BD-B9C2-1ACE21A808A8}"
HISTORICAL_SEASONS = list(range(2013, 2026))
CURRENT_SEASON = 2025

# ============================================================
# STEP 1 - READ EXCEL HISTORICAL DATA
# ============================================================
def read_excel_data():
    print("Reading Excel historical data...")
    xl = pd.ExcelFile(EXCEL_PATH)
    
    # Regular season
    rs = pd.read_excel(xl, sheet_name="Regular Season Data", header=0)
    rs = rs.dropna(subset=["Manager", "Season", "Week"])
    rs["Season"] = rs["Season"].astype(int)
    rs["Week"] = rs["Week"].astype(int)
    
    # Playoff data
    po = pd.read_excel(xl, sheet_name="Playoff Data", header=0)
    po = po.dropna(subset=["Manager", "Season"])
    po["Season"] = po["Season"].astype(int)
    
    # Final standings
    ft = pd.read_excel(xl, sheet_name="Final Tables", header=0)
    ft = ft.dropna(subset=["Owner First Name", "Season"])
    ft["Season"] = ft["Season"].astype(int)
    
    print(f"  Regular season records: {len(rs)}")
    print(f"  Playoff records: {len(po)}")
    print(f"  Final standings records: {len(ft)}")
    
    return rs, po, ft

# ============================================================
# STEP 2 - BUILD OWNER STATS
# ============================================================
def build_owner_stats(rs, po, ft):
    print("Building owner stats...")
    owners = {}
    
    for manager in rs["Manager"].unique():
        mgr_rs = rs[rs["Manager"] == manager]
        mgr_po = po[po["Manager"] == manager]
        mgr_ft = ft[ft["Owner First Name"] == manager]
        
        # Career regular season
        wins = len(mgr_rs[mgr_rs["Outcome"] == "W"])
        losses = len(mgr_rs[mgr_rs["Outcome"] == "L"])
        ties = len(mgr_rs[mgr_rs["Outcome"] == "T"])
        total_games = wins + losses + ties
        win_pct = round(wins / total_games, 4) if total_games > 0 else 0
        pts_for = round(float(mgr_rs["Points"].sum()), 2)
        pts_against = round(float(mgr_rs["Opp Score"].sum()), 2)
        pts_per_game = round(pts_for / total_games, 2) if total_games > 0 else 0
        
        # Playoff stats
        po_wins = len(mgr_po[mgr_po["Outcome"] == "W"])
        po_losses = len(mgr_po[mgr_po["Outcome"] == "L"])
        championships = len(mgr_ft[mgr_ft["Final Rank"] == 1])
        playoff_apps = len(mgr_ft[mgr_ft["Playoff App"] == "Y"])
        div_titles = len(mgr_ft[mgr_ft["Div Title"] == "Y"])
        
        # Season by season
        seasons = []
        for season in sorted(mgr_rs["Season"].unique()):
            s_rs = mgr_rs[mgr_rs["Season"] == season]
            s_ft = mgr_ft[mgr_ft["Season"] == season]
            s_wins = len(s_rs[s_rs["Outcome"] == "W"])
            s_losses = len(s_rs[s_rs["Outcome"] == "L"])
            s_ties = len(s_rs[s_rs["Outcome"] == "T"])
            s_pts = round(float(s_rs["Points"].sum()), 2)
            s_final_rank = int(s_ft["Final Rank"].values[0]) if len(s_ft) > 0 else None
            s_playoff = bool(s_ft["Playoff App"].values[0] == "Y") if len(s_ft) > 0 else False
            s_champ = bool(s_ft["Final Rank"].values[0] == 1) if len(s_ft) > 0 else False
            
            seasons.append({
                "season": int(season),
                "wins": s_wins,
                "losses": s_losses,
                "ties": s_ties,
                "points_for": s_pts,
                "final_rank": s_final_rank,
                "playoff": s_playoff,
                "champion": s_champ
            })
        
        owners[manager] = {
            "name": manager,
            "active": manager in ["Brian", "Watty", "Russell", "Charles", "Brent", 
                                  "Michael", "Mark", "Matt", "David", "Emily", 
                                  "BR", "Arnold", "Grayson", "Jordan"],
            "career": {
                "wins": wins,
                "losses": losses,
                "ties": ties,
                "win_pct": win_pct,
                "points_for": pts_for,
                "points_against": pts_against,
                "points_per_game": pts_per_game,
                "championships": championships,
                "playoff_appearances": playoff_apps,
                "division_titles": div_titles,
                "playoff_wins": po_wins,
                "playoff_losses": po_losses
            },
            "seasons": seasons
        }
    
    print(f"  Built stats for {len(owners)} owners")
    return owners

# ============================================================
# STEP 3 - BUILD HEAD TO HEAD RECORDS
# ============================================================
def build_head_to_head(rs):
    print("Building head to head records...")
    h2h = {}
    
    managers = rs["Manager"].unique()
    for m1 in managers:
        h2h[m1] = {}
        for m2 in managers:
            if m1 == m2:
                continue
            matchups = rs[(rs["Manager"] == m1) & (rs["Opponent"] == m2)]
            if len(matchups) == 0:
                continue
            wins = len(matchups[matchups["Outcome"] == "W"])
            losses = len(matchups[matchups["Outcome"] == "L"])
            ties = len(matchups[matchups["Outcome"] == "T"])
            pts_for = round(float(matchups["Points"].sum()), 2)
            pts_against = round(float(matchups["Opp Score"].sum()), 2)
            
            h2h[m1][m2] = {
                "wins": wins,
                "losses": losses,
                "ties": ties,
                "points_for": pts_for,
                "points_against": pts_against
            }
    
    print(f"  Built head to head for {len(h2h)} owners")
    return h2h

# ============================================================
# STEP 4 - BUILD SEASON DATA
# ============================================================
def build_seasons(rs, po, ft):
    print("Building season data...")
    seasons = {}
    
    for season in sorted(rs["Season"].unique()):
        s_rs = rs[rs["Season"] == season]
        s_po = po[po["Season"] == season]
        s_ft = ft[ft["Season"] == season]
        
        # Weekly matchups
        weeks = []
        for week in sorted(s_rs["Week"].unique()):
            w_rs = s_rs[s_rs["Week"] == week]
            matchups = []
            seen = set()
            for _, row in w_rs.iterrows():
                game = str(row["Game"])
                base = game[:-1]
                if base not in seen:
                    seen.add(base)
                    team1_rows = w_rs[w_rs["Game"].astype(str) == base + "1"]
                    team2_rows = w_rs[w_rs["Game"].astype(str) == base + "2"]
                    if len(team1_rows) > 0 and len(team2_rows) > 0:
                        team1 = team1_rows.iloc[0]
                        team2 = team2_rows.iloc[0]
                        matchups.append({
                            "team1": team1["Manager"],
                            "score1": float(team1["Points"]),
                            "team2": team2["Manager"],
                            "score2": float(team2["Points"])
                        })
            weeks.append({
                "week": int(week),
                "matchups": matchups
            })
        
        # Final standings
        standings = []
        for _, row in s_ft.sort_values("Final Rank").iterrows():
            standings.append({
                "rank": int(row["Final Rank"]) if pd.notna(row["Final Rank"]) else None,
                "owner": row["Owner First Name"],
                "wins": int(row["Wins"]),
                "losses": int(row["Losses"]),
                "ties": int(row["Ties"]) if pd.notna(row["Ties"]) else 0,
                "points_for": round(float(row["Points For"]), 2),
                "points_against": round(float(row["Points Against"]), 2),
                "playoff": row["Playoff App"] == "Y",
                "champion": row["Final Rank"] == 1
            })
        
        # Playoffs
        playoffs = []
        for _, row in s_po.iterrows():
            playoffs.append({
                "round": row["Round"],
                "manager": row["Manager"],
                "opponent": row["Opponent"],
                "points": float(row["Points"]),
                "outcome": row["Outcome"]
            })
        
        seasons[int(season)] = {
            "season": int(season),
            "weeks": weeks,
            "standings": standings,
            "playoffs": playoffs
        }
    
    print(f"  Built data for {len(seasons)} seasons")
    return seasons

# ============================================================
# STEP 5 - BUILD ALL TIME RECORDS
# ============================================================
def build_records(rs):
    print("Building all time records...")
    
    highest_score = rs.nlargest(10, "Points")[["Manager", "Opponent", "Season", "Week", "Points"]].to_dict("records")
    lowest_score = rs.nsmallest(10, "Points")[["Manager", "Opponent", "Season", "Week", "Points"]].to_dict("records")
    biggest_blowout = rs.nlargest(10, "Diff")[["Manager", "Opponent", "Season", "Week", "Points", "Diff"]].to_dict("records")
    
    # Clean up numpy types
    for record_list in [highest_score, lowest_score, biggest_blowout]:
        for r in record_list:
            for k, v in r.items():
                if hasattr(v, "item"):
                    r[k] = v.item()
    
    return {
        "highest_scores": highest_score,
        "lowest_scores": lowest_score,
        "biggest_blowouts": biggest_blowout
    }

# ============================================================
# STEP 6 - PULL ESPN 2025 DATA (if needed)
# ============================================================
def pull_espn_current(current_season, rs):
    print(f"Checking ESPN for {current_season} data...")
    
    # Check what weeks we already have from Excel
    existing_weeks = rs[rs["Season"] == current_season]["Week"].unique() if current_season in rs["Season"].values else []
    print(f"  Excel has weeks: {sorted(existing_weeks) if len(existing_weeks) > 0 else 'none'}")
    
    # For now return None - ESPN pull will be added in next step
    return None

# ============================================================
# STEP 7 - FOUNDING BROTHERS CUP
# ============================================================
def calculate_founding_brothers(rs, po):
    print("Calculating Founding Brothers Cup...")
    founders = ["David", "Russell", "Watty", "BR"]
    results = {}

    for season in sorted(rs["Season"].unique()):
        s_rs = rs[rs["Season"] == season]
        
        # Only matchups between the four founders
        founder_rs = s_rs[
            s_rs["Manager"].isin(founders) & s_rs["Opponent"].isin(founders)
        ]
        
        # Count wins, losses, and points for each founder
        standings = {}
        for founder in founders:
            f_games = founder_rs[founder_rs["Manager"] == founder]
            wins = len(f_games[f_games["Outcome"] == "W"])
            losses = len(f_games[f_games["Outcome"] == "L"])
            pts = round(float(f_games["Points"].sum()), 2)
            standings[founder] = {"wins": wins, "losses": losses, "points": pts}

        # Check for playoff matchups between founders
        s_po = po[po["Season"] == season]
        founder_po = s_po[
            s_po["Manager"].isin(founders) & s_po["Opponent"].isin(founders)
        ]
        playoff_wins = {}
        for founder in founders:
            f_po = founder_po[founder_po["Manager"] == founder]
            playoff_wins[founder] = len(f_po[f_po["Outcome"] == "W"])

        # Determine winner(s) with tiebreaker order:
        # 1. Most wins  2. Fewest losses  3. Most playoff wins  4. Most points
        max_wins = max(v["wins"] for v in standings.values())
        leaders = [f for f, v in standings.items() if v["wins"] == max_wins]

        if len(leaders) == 1:
            winner = leaders
        else:
            # Tiebreaker 1: fewest losses
            min_losses = min(standings[f]["losses"] for f in leaders)
            leaders = [f for f in leaders if standings[f]["losses"] == min_losses]

            if len(leaders) == 1:
                winner = leaders
            else:
                # Tiebreaker 2: most playoff wins against founders
                max_po_wins = max(playoff_wins[f] for f in leaders)
                leaders = [f for f in leaders if playoff_wins[f] == max_po_wins]

                if len(leaders) == 1:
                    winner = leaders
                else:
                    # Tiebreaker 3: most points against founders
                    max_pts = max(standings[f]["points"] for f in leaders)
                    leaders = [f for f in leaders if standings[f]["points"] == max_pts]
                    winner = leaders  # co-winners if still tied

        results[int(season)] = {
            "season": int(season),
            "winner": winner,
            "standings": [
                {
                    "owner": f,
                    "wins": standings[f]["wins"],
                    "losses": standings[f]["losses"],
                    "points": standings[f]["points"],
                    "playoff_wins": playoff_wins[f]
                }
                for f in founders
            ]
        }

    print(f"  Calculated Founding Brothers Cup for {len(results)} seasons")
    return results

# ============================================================
# STEP 8 - WOODSHEDS
# ============================================================
def calculate_woodsheds(rs, po):
    print("Calculating woodsheds...")
    MARGIN = 50.0

    # Regular season: compute signed margin for every row
    rs_m = rs.copy()
    rs_m["Margin"] = rs_m["Points"] - rs_m["Opp Score"]

    # RS woodshed entries (winner perspective only: Margin >= 50)
    rs_entries = [
        {
            "manager": str(r["Manager"]),
            "opponent": str(r["Opponent"]),
            "season": int(r["Season"]),
            "week": int(r["Week"]),
            "points": round(float(r["Points"]), 2),
            "opp_score": round(float(r["Opp Score"]), 2),
            "margin": round(float(r["Margin"]), 2),
            "type": "regular"
        }
        for _, r in rs_m[rs_m["Margin"] >= MARGIN].iterrows()
    ]

    # Playoff: build O(1) lookup then compute margins once per row
    po_lookup = {
        (int(r["Season"]), str(r["Round"]), str(r["Manager"]), str(r["Opponent"])): float(r["Points"])
        for _, r in po.iterrows()
    }
    po_games = []  # (manager, opponent, season, round_str, points, opp_score, margin)
    for _, row in po.iterrows():
        opp_key = (int(row["Season"]), str(row["Round"]), str(row["Opponent"]), str(row["Manager"]))
        if opp_key not in po_lookup:
            continue
        opp_score = po_lookup[opp_key]
        margin = float(row["Points"]) - opp_score
        po_games.append((
            str(row["Manager"]), str(row["Opponent"]),
            int(row["Season"]), str(row["Round"]),
            float(row["Points"]), opp_score, margin
        ))

    # Playoff woodshed entries (winner perspective: margin >= 50)
    po_entries = [
        {
            "manager": g[0], "opponent": g[1],
            "season": g[2], "week": g[3],
            "points": round(g[4], 2), "opp_score": round(g[5], 2),
            "margin": round(g[6], 2), "type": "playoff"
        }
        for g in po_games if g[6] >= MARGIN
    ]

    all_ws = sorted(rs_entries + po_entries, key=lambda x: x["margin"], reverse=True)
    top10 = all_ws[:10]

    # Per-owner stats (regular + playoff)
    owner_stats = {}
    for manager in rs["Manager"].unique():
        mgr = rs_m[rs_m["Manager"] == manager]
        rs_given    = int((mgr["Margin"] >= MARGIN).sum())
        rs_received = int((mgr["Margin"] <= -MARGIN).sum())
        po_given    = sum(1 for g in po_games if g[0] == manager and g[6] >= MARGIN)
        po_received = sum(1 for g in po_games if g[0] == manager and g[6] <= -MARGIN)
        owner_stats[manager] = {
            "given":    rs_given + po_given,
            "received": rs_received + po_received
        }

    print(f"  Found {len(all_ws)} woodsheds ({len(rs_entries)} regular, {len(po_entries)} playoff)")
    return {"top10": top10, "by_owner": owner_stats}


# ============================================================
# STEP 9 - WIN / LOSS STREAKS
# ============================================================
def calculate_streaks(rs):
    print("Calculating streaks...")

    ACTIVE_OWNERS = {
        "Brian", "Watty", "Russell", "Charles", "Brent",
        "Michael", "Mark", "Matt", "David", "Emily",
        "BR", "Arnold", "Grayson", "Jordan"
    }

    all_win_streaks  = []
    all_loss_streaks = []
    current_streaks  = {}

    for manager in rs["Manager"].unique():
        games = list(
            rs[rs["Manager"] == manager]
            .sort_values(["Season", "Week"])[["Season", "Week", "Outcome"]]
            .itertuples(index=False, name=None)
        )  # each element: (season, week, outcome)

        if not games:
            continue

        # Walk through finding every streak segment
        i = 0
        while i < len(games):
            outcome = games[i][2]
            j = i + 1
            while j < len(games) and games[j][2] == outcome:
                j += 1
            # Streak from index i to j-1
            if outcome in ("W", "L"):
                entry = {
                    "owner":        manager,
                    "length":       j - i,
                    "start_season": int(games[i][0]),
                    "start_week":   int(games[i][1]),
                    "end_season":   int(games[j - 1][0]),
                    "end_week":     int(games[j - 1][1])
                }
                (all_win_streaks if outcome == "W" else all_loss_streaks).append(entry)
            i = j

        # Current active streak for active owners
        if manager in ACTIVE_OWNERS:
            last_outcome = games[-1][2]
            if last_outcome in ("W", "L"):
                length = 0
                for k in range(len(games) - 1, -1, -1):
                    if games[k][2] == last_outcome:
                        length += 1
                    else:
                        break
                current_streaks[manager] = {
                    "owner": manager, "streak_type": last_outcome, "length": length
                }

    all_win_streaks.sort(key=lambda x: x["length"], reverse=True)
    all_loss_streaks.sort(key=lambda x: x["length"], reverse=True)

    print(f"  Calculated streaks for {len(current_streaks)} active owners")
    return {
        "top_win_streaks":  all_win_streaks[:10],
        "top_loss_streaks": all_loss_streaks[:10],
        "current":          current_streaks
    }


# ============================================================
# STEP 10 - DIVISIONAL RECORDS
# ============================================================
def calculate_divisional_records(rs):
    print("Calculating divisional records...")

    TEXAROK = {"Brent", "Brian", "David", "Emily", "Jordan", "Matt", "Russell", "Sarah"}
    AKCOVA  = {"Abby", "Arnold", "BR", "Charles", "Grayson", "Mark", "Michael", "Watty"}

    def div_record(games):
        return {
            "wins":          int((games["Outcome"] == "W").sum()),
            "losses":        int((games["Outcome"] == "L").sum()),
            "ties":          int((games["Outcome"] == "T").sum()),
            "points_for":    round(float(games["Points"].sum()), 2),
            "points_against": round(float(games["Opp Score"].sum()), 2)
        }

    # Interdivisional only: TEXAROK side vs AKCOVA side
    inter = rs[
        (rs["Manager"].isin(TEXAROK) & rs["Opponent"].isin(AKCOVA)) |
        (rs["Manager"].isin(AKCOVA)  & rs["Opponent"].isin(TEXAROK))
    ]

    # Season by season
    season_records = {}
    for season in sorted(inter["Season"].unique()):
        s = inter[inter["Season"] == season]
        season_records[int(season)] = {
            "season":  int(season),
            "TEXAROK": div_record(s[s["Manager"].isin(TEXAROK)]),
            "AKCOVA":  div_record(s[s["Manager"].isin(AKCOVA)])
        }

    # All-time totals
    all_time = {
        "TEXAROK": div_record(inter[inter["Manager"].isin(TEXAROK)]),
        "AKCOVA":  div_record(inter[inter["Manager"].isin(AKCOVA)])
    }

    print(f"  Calculated divisional records for {len(season_records)} seasons")
    return {"seasons": season_records, "all_time": all_time}


# ============================================================
# STEP 11 - LUCK METRICS
# ============================================================
def calculate_luck(rs):
    print("Calculating luck metrics...")

    # Per-season, per-manager average score
    season_avg_series = rs.groupby(["Manager", "Season"])["Points"].mean()
    season_avg = {
        (str(mgr), int(szn)): float(avg)
        for (mgr, szn), avg in season_avg_series.items()
    }

    game_rows = []
    for _, row in rs.iterrows():
        manager = str(row["Manager"])
        opponent = str(row["Opponent"])
        season = int(row["Season"])
        week = int(row["Week"])
        score = float(row["Points"])
        opp_score = float(row["Opp Score"])

        team_avg = season_avg.get((manager, season), score)
        opp_avg = season_avg.get((opponent, season), opp_score)

        team_dev = round(score - team_avg, 2)
        opp_dev = round(opp_score - opp_avg, 2)
        net_luck = round(team_dev - opp_dev, 2)

        game_rows.append({
            "year": season,
            "week": week,
            "team": manager,
            "opp": opponent,
            "team_display": manager,
            "opp_display": opponent,
            "score": round(score, 2),
            "opp_score": round(opp_score, 2),
            "team_deviation": team_dev,
            "opp_deviation": opp_dev,
            "net_luck": net_luck
        })

    game_rows.sort(key=lambda x: (x["year"], x["week"]), reverse=True)

    luck_summary = {}
    for manager in rs["Manager"].unique():
        mgr_rows = [r for r in game_rows if r["team"] == manager]
        if not mgr_rows:
            continue
        n = len(mgr_rows)
        avg_net = round(sum(r["net_luck"] for r in mgr_rows) / n, 2)
        avg_opp_under = round(sum(-r["opp_deviation"] for r in mgr_rows) / n, 2)
        avg_own_over = round(sum(r["team_deviation"] for r in mgr_rows) / n, 2)

        luckiest = max(mgr_rows, key=lambda r: r["net_luck"])
        unluckiest = min(mgr_rows, key=lambda r: r["net_luck"])

        luck_summary[manager] = {
            "net_luck_per_game": avg_net,
            "opponent_underperformance_per_game": avg_opp_under,
            "own_overperformance_per_game": avg_own_over,
            "luckiest_game": {
                "year": luckiest["year"],
                "week": luckiest["week"],
                "opp": luckiest["opp"],
                "margin": luckiest["net_luck"]
            },
            "unluckiest_game": {
                "year": unluckiest["year"],
                "week": unluckiest["week"],
                "opp": unluckiest["opp"],
                "margin": unluckiest["net_luck"]
            }
        }

    luck_by_matchup = {}
    for manager in rs["Manager"].unique():
        luck_by_matchup[str(manager)] = {}
        mgr_rows = [r for r in game_rows if r["team"] == manager]
        for opp in set(r["opp"] for r in mgr_rows):
            matchup_rows = [r for r in mgr_rows if r["opp"] == opp]
            luck_by_matchup[str(manager)][str(opp)] = {
                "avg_luck": round(sum(r["net_luck"] for r in matchup_rows) / len(matchup_rows), 2),
                "games": len(matchup_rows)
            }

    luck_by_season = {}
    for manager in rs["Manager"].unique():
        luck_by_season[str(manager)] = {}
        mgr_rows = [r for r in game_rows if r["team"] == manager]
        for year in sorted(set(r["year"] for r in mgr_rows)):
            season_rows = [r for r in mgr_rows if r["year"] == year]
            luck_by_season[str(manager)][int(year)] = {
                "net_luck": round(sum(r["net_luck"] for r in season_rows), 2),
                "opponent_component": round(sum(-r["opp_deviation"] for r in season_rows), 2),
                "own_component": round(sum(r["team_deviation"] for r in season_rows), 2)
            }

    print(f"  Calculated luck for {len(luck_summary)} teams, {len(game_rows)} games")
    return {
        "luck_summary": luck_summary,
        "luck_by_matchup": luck_by_matchup,
        "luck_by_season": luck_by_season,
        "luck_game_log": game_rows
    }


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 50)
    print("SFFL Data Builder")
    print("=" * 50)
    
    # Read Excel
    rs, po, ft = read_excel_data()
    
    # Build all data structures
    owners = build_owner_stats(rs, po, ft)
    h2h = build_head_to_head(rs)
    seasons = build_seasons(rs, po, ft)
    records = build_records(rs)
    
    # Check ESPN for current season
    pull_espn_current(CURRENT_SEASON, rs)

    founding_brothers = calculate_founding_brothers(rs, po)
    woodsheds         = calculate_woodsheds(rs, po)
    streaks           = calculate_streaks(rs)
    divisional        = calculate_divisional_records(rs)
    luck              = calculate_luck(rs)

    # Merge woodshed career stats into each owner
    for manager, ws in woodsheds["by_owner"].items():
        if manager in owners:
            owners[manager]["career"]["woodsheds_given"]    = ws["given"]
            owners[manager]["career"]["woodsheds_received"] = ws["received"]

    # Combine everything
    data = {
        "meta": {
            "league_name": "Strickland Fantasy Football League",
            "abbreviation": "SFFL",
            "founded": 2013,
            "current_season": CURRENT_SEASON,
            "last_updated": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M")
        },
        "owners": owners,
        "head_to_head": h2h,
        "seasons": seasons,
        "records": records,
        "founding_brothers": founding_brothers,
        "woodsheds": woodsheds,
        "streaks": streaks,
        "divisional": divisional,
        "luck": luck
    }
    
    # Write output
    with open(OUTPUT_PATH, "w") as f:
        json.dump(data, f, indent=2, default=str)
    
    print("=" * 50)
    print(f"Success! data.json written to {OUTPUT_PATH}")
    print("=" * 50)

if __name__ == "__main__":
    main()