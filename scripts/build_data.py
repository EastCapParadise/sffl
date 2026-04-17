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
                if game not in seen:
                    seen.add(game)
                    team1 = w_rs[w_rs["Game"] == row["Game"]].iloc[0]
                    team2 = w_rs[w_rs["Game"] == row["Game"]].iloc[1] if len(w_rs[w_rs["Game"] == row["Game"]]) > 1 else None
                    if team2 is not None:
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
        "records": records
    }
    
    # Write output
    with open(OUTPUT_PATH, "w") as f:
        json.dump(data, f, indent=2, default=str)
    
    print("=" * 50)
    print(f"Success! data.json written to {OUTPUT_PATH}")
    print("=" * 50)

if __name__ == "__main__":
    main()