// 全局變數
let tournamentData = {
    rounds: [],
    teams: [],
    fixedGroups: [],
    courtCount: 0,
    malePlayers: [],
    femalePlayers: []
};

// 工具函數：Fisher-Yates 洗牌算法
function shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 工具函數：檢查兩個隊伍是否有重複選手
function hasCommonPlayers(team1, team2) {
    return team1.some(player => team2.includes(player));
}

// 工具函數：檢查隊伍是否包含固定分組的選手
function isFixedTeam(team) {
    return tournamentData.fixedGroups.some(fixedTeam => 
        fixedTeam.length === team.length && 
        fixedTeam.every(player => team.includes(player))
    );
}

// 工具函數：計算隊伍的上場次數
function getTeamPlayCount(team) {
    return tournamentData.rounds.reduce((count, round) => {
        return count + round.matches.filter(match => 
            match.team1.players.join(',') === team.players.join(',') || 
            match.team2.players.join(',') === team.players.join(',')
        ).length;
    }, 0);
}

// 工具函數：檢查選手是否在同一輪中重複出賽
function hasPlayerConflict(round, newMatch) {
    const playersInRound = new Set();
    
    // 收集當前輪次中所有已安排的選手
    round.matches.forEach(match => {
        match.team1.players.forEach(player => playersInRound.add(player));
        match.team2.players.forEach(player => playersInRound.add(player));
    });
    
    // 檢查新比賽的選手是否與現有選手衝突
    return newMatch.team1.players.some(player => playersInRound.has(player)) ||
           newMatch.team2.players.some(player => playersInRound.has(player));
}

// 工具函數：檢查兩個隊伍是否已經對戰過
function hasTeamMatchHistory(team1, team2) {
    return tournamentData.rounds.some(round => 
        round.matches.some(match => 
            (match.team1.players.join(',') === team1.players.join(',') && 
             match.team2.players.join(',') === team2.players.join(',')) ||
            (match.team1.players.join(',') === team2.players.join(',') && 
             match.team2.players.join(',') === team1.players.join(','))
        )
    );
}

// 工具函數：計算兩個隊伍的對戰次數
function getTeamMatchCount(team1, team2) {
    return tournamentData.rounds.reduce((count, round) => {
        return count + round.matches.filter(match => 
            (match.team1.players.join(',') === team1.players.join(',') && 
             match.team2.players.join(',') === team2.players.join(',')) ||
            (match.team1.players.join(',') === team2.players.join(',') && 
             match.team2.players.join(',') === team1.players.join(','))
        ).length;
    }, 0);
}

// 創建混雙隊伍
function createMixedTeams() {
    const teams = [];
    const malePlayers = [...tournamentData.malePlayers];
    const femalePlayers = [...tournamentData.femalePlayers];
    
    // 先處理固定分組
    tournamentData.fixedGroups.forEach(fixedTeam => {
        teams.push([...fixedTeam]);
    });
    
    // 隨機打亂剩餘選手
    const remainingMalePlayers = malePlayers.filter(male => 
        !tournamentData.fixedGroups.some(fixedTeam => fixedTeam.includes(male))
    );
    const remainingFemalePlayers = femalePlayers.filter(female => 
        !tournamentData.fixedGroups.some(fixedTeam => fixedTeam.includes(female))
    );
    
    // 隨機打亂選手順序
    const shuffledMalePlayers = shuffle(remainingMalePlayers);
    const shuffledFemalePlayers = shuffle(remainingFemalePlayers);
    
    // 創建混雙隊伍
    while (shuffledMalePlayers.length > 0 && shuffledFemalePlayers.length > 0) {
        const male = shuffledMalePlayers.shift();
        const female = shuffledFemalePlayers.shift();
        teams.push([male, female]);
    }
    
    // 如果還有剩餘的男生，創建男雙
    while (shuffledMalePlayers.length >= 2) {
        teams.push([shuffledMalePlayers.shift(), shuffledMalePlayers.shift()]);
    }
    
    // 如果還有剩餘的女生，創建女雙
    while (shuffledFemalePlayers.length >= 2) {
        teams.push([shuffledFemalePlayers.shift(), shuffledFemalePlayers.shift()]);
    }
    
    // 如果還有單個選手，嘗試與其他隊伍配對
    if (shuffledMalePlayers.length === 1 && shuffledFemalePlayers.length === 1) {
        teams.push([shuffledMalePlayers[0], shuffledFemalePlayers[0]]);
    } else if (shuffledMalePlayers.length === 1) {
        // 找一個只有一個人的隊伍來配對
        for (let i = 0; i < teams.length; i++) {
            if (teams[i].length === 1) {
                teams[i].push(shuffledMalePlayers[0]);
                break;
            }
        }
    } else if (shuffledFemalePlayers.length === 1) {
        for (let i = 0; i < teams.length; i++) {
            if (teams[i].length === 1) {
                teams[i].push(shuffledFemalePlayers[0]);
                break;
            }
        }
    }
    
    // 隨機打亂最終隊伍順序並添加組別號碼
    const finalTeams = shuffle(teams.filter(team => team.length === 2));
    return finalTeams.map((team, index) => ({
        id: index + 1,
        players: team
    }));
}

// 生成一輪比賽
function generateRound(roundNumber) {
    const round = {
        roundNumber: roundNumber,
        matches: []
    };
    
    // 獲取所有隊伍的上場次數
    const teamPlayCounts = new Map();
    tournamentData.teams.forEach(team => {
        teamPlayCounts.set(team.players.join(','), getTeamPlayCount(team));
    });
    
    // 按上場次數排序隊伍（優先選擇上場次數少的）
    const sortedTeams = [...tournamentData.teams].sort((a, b) => {
        const countA = teamPlayCounts.get(a.players.join(','));
        const countB = teamPlayCounts.get(b.players.join(','));
        return countA - countB;
    });
    
    const availableTeams = [...sortedTeams];
    
    // 為每個場地安排比賽
    for (let court = 1; court <= tournamentData.courtCount; court++) {
        if (availableTeams.length < 2) break;
        
        // 選擇上場次數最少的隊伍作為第一隊
        let team1 = availableTeams[0];
        
        // 從可用隊伍中移除第一隊
        availableTeams.splice(0, 1);
        
        // 找到合適的第二隊（優先選擇上場次數相近的）
        let team2 = null;
        let bestMatch = null;
        let minDifference = Infinity;
        
        for (let i = 0; i < availableTeams.length; i++) {
            const candidate = availableTeams[i];
            
            // 檢查是否有選手衝突
            const hasConflict = hasPlayerConflict(round, {
                team1: team1,
                team2: candidate
            });
            
            if (!hasConflict) {
                const count1 = teamPlayCounts.get(team1.players.join(','));
                const count2 = teamPlayCounts.get(candidate.players.join(','));
                const difference = Math.abs(count1 - count2);
                
                // 優先選擇上場次數相近的隊伍
                if (difference < minDifference) {
                    minDifference = difference;
                    bestMatch = candidate;
                }
            }
        }
        
        if (bestMatch) {
            team2 = bestMatch;
        } else {
            // 如果找不到合適的對手，選擇上場次數最少的
            team2 = availableTeams[0];
        }
        
        // 從可用隊伍中移除第二隊
        const team2Index = availableTeams.findIndex(team => 
            team.players.join(',') === team2.players.join(',')
        );
        availableTeams.splice(team2Index, 1);
        
        // 添加比賽到輪次中
        round.matches.push({
            court: court,
            team1: team1,
            team2: team2
        });
        
        // 更新上場次數
        teamPlayCounts.set(team1.players.join(','), teamPlayCounts.get(team1.players.join(',')) + 1);
        teamPlayCounts.set(team2.players.join(','), teamPlayCounts.get(team2.players.join(',')) + 1);
        
        // 重新排序可用隊伍
        availableTeams.sort((a, b) => {
            const countA = teamPlayCounts.get(a.players.join(','));
            const countB = teamPlayCounts.get(b.players.join(','));
            return countA - countB;
        });
    }
    
    return round;
}

// 生成單場地輪次（更嚴格的公平性）
function generateSingleCourtRound(roundNumber, teamTargetMatches, teamPlayCounts, teamScores) {
    const round = {
        roundNumber: roundNumber,
        matches: []
    };
    
    // 找到上場次數最少的隊伍
    let minPlayCount = Infinity;
    let selectedTeam = null;
    
    tournamentData.teams.forEach(team => {
        const playCount = teamPlayCounts.get(team.players.join(','));
        if (playCount < minPlayCount) {
            minPlayCount = playCount;
            selectedTeam = team;
        }
    });
    
    if (!selectedTeam) return round;
    
    // 找到合適的對手（優先選擇未對戰過且上場次數相近的）
    let bestOpponent = null;
    let minDifference = Infinity;
    let minMatchCount = Infinity;
    
    tournamentData.teams.forEach(team => {
        if (team.id === selectedTeam.id) return;
        
        const playCount1 = teamPlayCounts.get(selectedTeam.players.join(','));
        const playCount2 = teamPlayCounts.get(team.players.join(','));
        const difference = Math.abs(playCount1 - playCount2);
        const matchCount = getTeamMatchCount(selectedTeam, team);
        
        // 優先選擇未對戰過的隊伍
        if (matchCount === 0) {
            if (difference < minDifference) {
                minDifference = difference;
                bestOpponent = team;
            }
        } else if (matchCount < minMatchCount) {
            // 如果都對戰過了，選擇對戰次數最少的
            minMatchCount = matchCount;
            minDifference = difference;
            bestOpponent = team;
        } else if (matchCount === minMatchCount && difference < minDifference) {
            minDifference = difference;
            bestOpponent = team;
        }
    });
    
    if (bestOpponent) {
        round.matches.push({
            court: 1,
            team1: selectedTeam,
            team2: bestOpponent
        });
    }
    
    return round;
}

// 生成一輪比賽（使用目標上場次數）
function generateRoundWithTargets(roundNumber, teamTargetMatches) {
    const round = {
        roundNumber: roundNumber,
        matches: []
    };
    
    // 獲取所有隊伍的當前上場次數
    const teamPlayCounts = new Map();
    tournamentData.teams.forEach(team => {
        teamPlayCounts.set(team.players.join(','), getTeamPlayCount(team));
    });
    
    // 計算每隊的優先級分數（基於目標與實際上場次數的差距）
    const teamScores = new Map();
    tournamentData.teams.forEach(team => {
        const currentCount = teamPlayCounts.get(team.players.join(','));
        const targetCount = teamTargetMatches.get(team.players.join(','));
        const deficit = targetCount - currentCount;
        teamScores.set(team.players.join(','), deficit);
    });
    
    // 特殊處理：如果只有一個場地，使用更嚴格的公平性算法
    if (tournamentData.courtCount === 1) {
        return generateSingleCourtRound(roundNumber, teamTargetMatches, teamPlayCounts, teamScores);
    }
    
    // 按優先級分數排序隊伍，但加入隨機化因素
    const sortedTeams = [...tournamentData.teams].sort((a, b) => {
        const scoreA = teamScores.get(a.players.join(','));
        const scoreB = teamScores.get(b.players.join(','));
        const scoreDiff = scoreB - scoreA;
        
        // 如果分數差距很小，加入隨機化
        if (Math.abs(scoreDiff) <= 1) {
            return Math.random() - 0.5; // 隨機排序
        }
        return scoreDiff;
    });
    
    // 隨機打亂優先級相近的隊伍
    const availableTeams = shuffle(sortedTeams);
    
    // 為每個場地安排比賽
    for (let court = 1; court <= tournamentData.courtCount; court++) {
        if (availableTeams.length < 2) break;
        
        // 選擇優先級最高的隊伍作為第一隊
        let team1 = availableTeams[0];
        
        // 從可用隊伍中移除第一隊
        availableTeams.splice(0, 1);
        
        // 找到合適的第二隊
        let team2 = null;
        let bestMatches = [];
        let bestScore = -Infinity;
        let minMatchCount = Infinity;
        
        for (let i = 0; i < availableTeams.length; i++) {
            const candidate = availableTeams[i];
            
            // 檢查是否有選手衝突
            const hasConflict = hasPlayerConflict(round, {
                team1: team1,
                team2: candidate
            });
            
            if (!hasConflict) {
                const score1 = teamScores.get(team1.players.join(','));
                const score2 = teamScores.get(candidate.players.join(','));
                const combinedScore = score1 + score2;
                const matchCount = getTeamMatchCount(team1, candidate);
                
                // 優先選擇未對戰過的隊伍
                if (matchCount === 0) {
                    if (combinedScore > bestScore) {
                        bestScore = combinedScore;
                        bestMatches = [candidate];
                        minMatchCount = 0;
                    } else if (combinedScore === bestScore) {
                        bestMatches.push(candidate);
                    }
                } else if (matchCount < minMatchCount) {
                    // 如果都對戰過了，選擇對戰次數最少的
                    minMatchCount = matchCount;
                    bestScore = combinedScore;
                    bestMatches = [candidate];
                } else if (matchCount === minMatchCount) {
                    if (combinedScore > bestScore) {
                        bestScore = combinedScore;
                        bestMatches = [candidate];
                    } else if (combinedScore === bestScore) {
                        bestMatches.push(candidate);
                    }
                }
            }
        }
        
        if (bestMatches.length > 0) {
            // 從最佳匹配中隨機選擇一個
            team2 = bestMatches[Math.floor(Math.random() * bestMatches.length)];
        } else {
            // 如果找不到合適的對手，從可用隊伍中隨機選擇
            team2 = availableTeams[Math.floor(Math.random() * availableTeams.length)];
        }
        
        // 從可用隊伍中移除第二隊
        const team2Index = availableTeams.findIndex(team => 
            team.players.join(',') === team2.players.join(',')
        );
        availableTeams.splice(team2Index, 1);
        
        // 添加比賽到輪次中
        round.matches.push({
            court: court,
            team1: team1,
            team2: team2
        });
        
        // 更新上場次數和優先級分數
        teamPlayCounts.set(team1.players.join(','), teamPlayCounts.get(team1.players.join(',')) + 1);
        teamPlayCounts.set(team2.players.join(','), teamPlayCounts.get(team2.players.join(',')) + 1);
        
        // 重新計算優先級分數
        availableTeams.forEach(team => {
            const currentCount = teamPlayCounts.get(team.players.join(','));
            const targetCount = teamTargetMatches.get(team.players.join(','));
            const deficit = targetCount - currentCount;
            teamScores.set(team.players.join(','), deficit);
        });
        
        // 重新排序可用隊伍，加入隨機化
        availableTeams.sort((a, b) => {
            const scoreA = teamScores.get(a.players.join(','));
            const scoreB = teamScores.get(b.players.join(','));
            const scoreDiff = scoreB - scoreA;
            
            // 如果分數差距很小，加入隨機化
            if (Math.abs(scoreDiff) <= 1) {
                return Math.random() - 0.5;
            }
            return scoreDiff;
        });
    }
    
    return round;
}

// 生成完整比賽表
function generateTournament() {
    // 獲取輸入數據
    const malePlayersText = document.getElementById('malePlayers').value.trim();
    const femalePlayersText = document.getElementById('femalePlayers').value.trim();
    const courtCount = parseInt(document.getElementById('courtCount').value);
    const fixedGroupsText = document.getElementById('fixedGroups').value.trim();
    
    // 驗證輸入
    if (!malePlayersText && !femalePlayersText) {
        alert('請至少輸入男生或女生的名字！');
        return;
    }
    
    if (courtCount < 1 || courtCount > 10) {
        alert('場地數量必須在1-10之間！');
        return;
    }
    
    // 解析選手名單
    tournamentData.malePlayers = malePlayersText.split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    
    tournamentData.femalePlayers = femalePlayersText.split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    
    // 解析固定分組
    tournamentData.fixedGroups = [];
    if (fixedGroupsText) {
        tournamentData.fixedGroups = fixedGroupsText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.split(',').map(name => name.trim()));
    }
    
    tournamentData.courtCount = courtCount;
    tournamentData.rounds = [];
    
    // 創建隊伍
    tournamentData.teams = createMixedTeams();
    
    if (tournamentData.teams.length < 2) {
        alert('選手數量不足以進行雙打比賽！至少需要4名選手。');
        return;
    }
    
    // 計算理想的每隊上場次數
    const totalMatches = 10 * courtCount; // 10輪 * 場地數
    const totalTeams = tournamentData.teams.length;
    const idealMatchesPerTeam = Math.floor(totalMatches / totalTeams);
    const extraMatches = totalMatches % totalTeams;
    
    // 為每隊設定目標上場次數
    const teamTargetMatches = new Map();
    tournamentData.teams.forEach((team, index) => {
        const targetMatches = idealMatchesPerTeam + (index < extraMatches ? 1 : 0);
        teamTargetMatches.set(team.players.join(','), targetMatches);
    });
    
    // 生成10輪比賽
    for (let round = 1; round <= 10; round++) {
        const roundData = generateRoundWithTargets(round, teamTargetMatches);
        tournamentData.rounds.push(roundData);
    }
    
    // 顯示結果
    displayResults();
    
    // 顯示下載按鈕
    document.getElementById('downloadBtn').style.display = 'inline-block';
    
    // 顯示隨機化提示
    console.log('🎲 本次比賽表已隨機生成，下次點擊會產生不同的結果！');
}

// 顯示比賽結果
function displayResults() {
    const resultsDiv = document.getElementById('results');
    let html = '<h2>🏆 比賽表</h2>';
    
    tournamentData.rounds.forEach(round => {
        html += `<div class="round">
            <h3>第 ${round.roundNumber} 輪</h3>`;
        
        round.matches.forEach(match => {
            html += `<div class="court">
                <strong>場地 ${match.court}：</strong>
                <span class="team">第${match.team1.id}組 (${match.team1.players.join(' + ')})</span>
                <span class="vs">VS</span>
                <span class="team">第${match.team2.id}組 (${match.team2.players.join(' + ')})</span>
            </div>`;
        });
        
        html += '</div>';
    });
    
    // 添加統計信息
    html += '<div class="round"><h3>📊 隊伍上場次數統計</h3>';
    const teamStats = new Map();
    
    // 計算理想上場次數
    const totalMatches = 10 * tournamentData.courtCount;
    const totalTeams = tournamentData.teams.length;
    const idealMatchesPerTeam = Math.floor(totalMatches / totalTeams);
    const extraMatches = totalMatches % totalTeams;
    
    // 計算對戰次數統計
    const matchHistory = new Map();
    tournamentData.teams.forEach(team1 => {
        tournamentData.teams.forEach(team2 => {
            if (team1.id !== team2.id) {
                const key = `${team1.id}-${team2.id}`;
                const reverseKey = `${team2.id}-${team1.id}`;
                if (!matchHistory.has(key) && !matchHistory.has(reverseKey)) {
                    const matchCount = getTeamMatchCount(team1, team2);
                    matchHistory.set(key, matchCount);
                }
            }
        });
    });
    
    tournamentData.teams.forEach((team, index) => {
        const playCount = getTeamPlayCount(team);
        const targetMatches = idealMatchesPerTeam + (index < extraMatches ? 1 : 0);
        const difference = playCount - targetMatches;
        
        let status = '';
        if (difference === 0) {
            status = '✅ 完美平衡';
        } else if (Math.abs(difference) <= 1) {
            status = '🟡 輕微偏差';
        } else {
            status = '🔴 需要調整';
        }
        
        teamStats.set(`第${team.id}組 (${team.players.join(' + ')})`, {
            count: playCount,
            target: targetMatches,
            difference: difference,
            status: status
        });
    });
    
    // 按上場次數排序顯示
    const sortedStats = Array.from(teamStats.entries()).sort((a, b) => a[1].count - b[1].count);
    
    // 計算對戰次數統計
    const matchCounts = Array.from(matchHistory.values());
    const uniqueMatches = matchCounts.filter(count => count === 1).length;
    const repeatedMatches = matchCounts.filter(count => count > 1).length;
    const noMatches = matchCounts.filter(count => count === 0).length;
    
    html += `<div style="margin-bottom: 15px; padding: 10px; background: #f0f8ff; border-radius: 5px;">
        <strong>📈 公平性分析：</strong><br>
        總比賽數：${totalMatches} | 隊伍數：${totalTeams} | 理想每隊上場：${idealMatchesPerTeam}次<br>
        <strong>🔄 對戰次數分析：</strong><br>
        唯一對戰：${uniqueMatches}組 | 重複對戰：${repeatedMatches}組 | 未對戰：${noMatches}組
    </div>`;
    
    sortedStats.forEach(([team, stats]) => {
        const color = stats.difference === 0 ? '#28a745' : 
                     Math.abs(stats.difference) <= 1 ? '#ffc107' : '#dc3545';
        
        html += `<div style="margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid ${color};">
            <strong>${team}</strong><br>
            上場 ${stats.count} 次 (目標: ${stats.target}次) 
            <span style="color: ${color}; font-weight: bold;">${stats.status}</span>
        </div>`;
    });
    
    html += '</div>';
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
}

// 下載比賽表
function downloadResults() {
    let content = '羽球雙打比賽表\n';
    content += '='.repeat(50) + '\n\n';
    
    tournamentData.rounds.forEach(round => {
        content += `第 ${round.roundNumber} 輪\n`;
        content += '-'.repeat(20) + '\n';
        
        round.matches.forEach(match => {
            content += `場地 ${match.court}：第${match.team1.id}組 (${match.team1.players.join(' + ')}) VS 第${match.team2.id}組 (${match.team2.players.join(' + ')})\n`;
        });
        
        content += '\n';
    });
    
    // 添加統計信息
    content += '隊伍上場次數統計\n';
    content += '-'.repeat(20) + '\n';
    
    // 計算理想上場次數
    const totalMatches = 10 * tournamentData.courtCount;
    const totalTeams = tournamentData.teams.length;
    const idealMatchesPerTeam = Math.floor(totalMatches / totalTeams);
    const extraMatches = totalMatches % totalTeams;
    
    // 計算對戰次數統計
    const matchHistory = new Map();
    tournamentData.teams.forEach(team1 => {
        tournamentData.teams.forEach(team2 => {
            if (team1.id !== team2.id) {
                const key = `${team1.id}-${team2.id}`;
                const reverseKey = `${team2.id}-${team1.id}`;
                if (!matchHistory.has(key) && !matchHistory.has(reverseKey)) {
                    const matchCount = getTeamMatchCount(team1, team2);
                    matchHistory.set(key, matchCount);
                }
            }
        });
    });
    
    const matchCounts = Array.from(matchHistory.values());
    const uniqueMatches = matchCounts.filter(count => count === 1).length;
    const repeatedMatches = matchCounts.filter(count => count > 1).length;
    const noMatches = matchCounts.filter(count => count === 0).length;
    
    content += `總比賽數：${totalMatches} | 隊伍數：${totalTeams} | 理想每隊上場：${idealMatchesPerTeam}次\n`;
    content += `對戰次數分析：唯一對戰${uniqueMatches}組 | 重複對戰${repeatedMatches}組 | 未對戰${noMatches}組\n\n`;
    
    const teamStats = new Map();
    tournamentData.teams.forEach((team, index) => {
        const playCount = getTeamPlayCount(team);
        const targetMatches = idealMatchesPerTeam + (index < extraMatches ? 1 : 0);
        const difference = playCount - targetMatches;
        
        let status = '';
        if (difference === 0) {
            status = '✅ 完美平衡';
        } else if (Math.abs(difference) <= 1) {
            status = '🟡 輕微偏差';
        } else {
            status = '🔴 需要調整';
        }
        
        teamStats.set(`第${team.id}組 (${team.players.join(' + ')})`, {
            count: playCount,
            target: targetMatches,
            difference: difference,
            status: status
        });
    });
    
    // 按上場次數排序顯示
    const sortedStats = Array.from(teamStats.entries()).sort((a, b) => a[1].count - b[1].count);
    
    sortedStats.forEach(([team, stats]) => {
        content += `${team}：上場 ${stats.count} 次 (目標: ${stats.target}次) ${stats.status}\n`;
    });
    
    // 創建並下載文件
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '羽球雙打比賽表.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 頁面載入時的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 可以添加一些初始化代碼
    console.log('羽球雙打分組系統已載入');
});
