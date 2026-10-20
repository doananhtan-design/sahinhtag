"""Regression tests for shared B08/B12 repeat-TAG flow; model of app.js rules."""
from dataclasses import dataclass, field

@dataclass
class R:
    key: str
    start: int
    check: int
    state: int = 0
    repeat120Active: bool = False
    repeatStartWaitingReturn: bool = False
    repeatStartAt: int = 0
    repeatStartDeadlineAt: int = 0
    repeatStartDone: bool = False
    repeatStartLastSeenAt: int = 0
    checkAudioPlayed: bool = False
    checkAudioPending: bool = False
    checkAudioRetryAt: int = 0
    finished: bool = False
    audio_calls: list = field(default_factory=list)
    timer_displayed_immediately: bool = False

def start(r,t):
    if r.state==0:
        r.state=1; r.repeat120Active=True; r.repeatStartWaitingReturn=True
        r.repeatStartAt=t; r.repeatStartDeadlineAt=t+120000; r.repeatStartDone=False
        r.repeatStartLastSeenAt=t; r.checkAudioPlayed=False; r.checkAudioPending=False
        r.timer_displayed_immediately=True
        return 'REPEAT_START'

def handle(r,tag,t):
    if r.state!=1: return 'WAITING'
    if tag==r.check and not r.checkAudioPlayed and not r.checkAudioPending and t>=r.checkAudioRetryAt:
        r.checkAudioPending=True; r.audio_calls.append((r.key,'dungxe.mp3'))
        r.checkAudioPending=False; r.checkAudioPlayed=True
        return 'CHECK_STOP_AUDIO'
    if tag==r.start:
        if r.repeatStartWaitingReturn: return 'WAITING'
        r.repeatStartDone=True; r.repeatStartDeadlineAt=0; r.repeat120Active=False; r.finished=True
        return 'FINISHED'
    return 'WAITING'

def update(r,t,detected_ids=()):
    if r.repeat120Active and r.repeatStartDeadlineAt>0 and not r.repeatStartDone:
        # Actual detector output (all IDs), not only the selected nearest ID.
        if r.start in detected_ids:
            r.repeatStartLastSeenAt=t
        elif r.repeatStartWaitingReturn and r.repeatStartLastSeenAt>0 and t-r.repeatStartLastSeenAt>=800:
            r.repeatStartWaitingReturn=False
        remain=max(0,r.repeatStartDeadlineAt-t)
        if remain<=0:
            r.audio_calls.append((r.key,'quatg1.mp3')); r.repeatStartDone=True; r.repeatStartDeadlineAt=0; r.repeat120Active=False
        return remain
    return None

def run(key,start_tag,check_tag):
    r=R(key,start_tag,check_tag)
    assert start(r,0)=='REPEAT_START'
    assert r.repeat120Active and r.repeatStartDeadlineAt==120000 and r.repeatStartWaitingReturn
    assert r.timer_displayed_immediately
    assert update(r,100,[start_tag])==119900
    # Start TAG still exists in the frame even though another TAG is selected nearest.
    assert update(r,500,[start_tag,check_tag])==119500
    assert r.repeatStartWaitingReturn
    assert handle(r,start_tag,600)=='WAITING'
    # Once start TAG is truly absent for >=800ms, second appearance may finish.
    assert update(r,1299,[check_tag])==118701
    assert r.repeatStartWaitingReturn
    assert update(r,1300,[check_tag])==118700
    assert not r.repeatStartWaitingReturn
    assert handle(r,check_tag,1400)=='CHECK_STOP_AUDIO'
    assert (key,'dungxe.mp3') in r.audio_calls
    assert handle(r,start_tag,1500)=='FINISHED'
    assert r.finished and not r.repeat120Active and r.repeatStartDeadlineAt==0
    return r

for key, st, ck in [('b08',81,82),('b12',121,123)]:
    r=run(key,st,ck)
    print(key, 'PASS: timer immediate, actual TAG-loss debounce, check audio, second TAG')

# Timeout is warning-only and does not finish the exercise.
for key, st, ck in [('b08',81,82),('b12',121,123)]:
    r=R(key,st,ck); start(r,0); assert update(r,120000,[])==0
    assert not r.finished and not r.repeat120Active
    assert handle(r,ck,120500)=='CHECK_STOP_AUDIO'
    print(key, 'TIMEOUT-WARNING-ONLY PASS')
