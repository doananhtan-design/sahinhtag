from dataclasses import dataclass

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
    audio_calls: list = None
    def __post_init__(self): self.audio_calls=[]

def start(r,t):
    if r.state==0:
        r.state=1; r.repeat120Active=True; r.repeatStartWaitingReturn=True
        r.repeatStartAt=t; r.repeatStartDeadlineAt=t+120000; r.repeatStartDone=False
        r.repeatStartLastSeenAt=t; r.checkAudioPlayed=False; r.checkAudioPending=False
        return 'REPEAT_START'

def handle(r,tag,t):
    if r.state!=1: return 'WAITING'
    if tag==r.check and not r.checkAudioPlayed and not r.checkAudioPending and t>=r.checkAudioRetryAt:
        r.checkAudioPending=True; r.audio_calls.append((r.key,'dungxe.mp3'))
        r.checkAudioPending=False; r.checkAudioPlayed=True
        return 'CHECK_STOP_AUDIO'
    if tag==r.start:
        r.repeatStartLastSeenAt=t
        if r.repeatStartWaitingReturn: return 'WAITING'
        r.repeatStartDone=True; r.repeatStartDeadlineAt=0; r.repeat120Active=False; r.finished=True
        return 'FINISHED'
    return 'WAITING'

def update(r,t,tag_seen=None):
    if r.repeat120Active and r.repeatStartDeadlineAt>0 and not r.repeatStartDone:
        if r.repeatStartWaitingReturn and t-r.repeatStartLastSeenAt>=800:
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
    assert update(r,100)==119900
    assert handle(r,start_tag,100)=='WAITING'  # same tag keeps waiting; no premature finish
    assert update(r,500)==119500
    assert r.repeatStartWaitingReturn
    assert update(r,900)==119100
    assert not r.repeatStartWaitingReturn
    assert update(r,1000)==119000
    assert handle(r,check_tag,1000)=='CHECK_STOP_AUDIO'
    assert (key,'dungxe.mp3') in r.audio_calls
    assert handle(r,start_tag,1200)=='FINISHED'
    assert r.finished and not r.repeat120Active and r.repeatStartDeadlineAt==0
    return r

for key, st, ck in [('b08',81,82),('b12',121,123)]:
    r=run(key,st,ck)
    print(key, 'PASS', r.audio_calls)

# timeout warning only: both courses stay active and can still receive check tag
for key, st, ck in [('b08',81,82),('b12',121,123)]:
    r=R(key,st,ck); start(r,0); assert update(r,120000)==0
    assert not r.finished and not r.repeat120Active
    assert handle(r,ck,120500)=='CHECK_STOP_AUDIO'
    print(key, 'TIMEOUT-WARNING-ONLY PASS')
