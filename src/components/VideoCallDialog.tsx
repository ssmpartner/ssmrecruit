import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Video, Maximize2, Minimize2, PhoneOff } from 'lucide-react';
import { useLeads } from '@/context/useLeads';

interface VideoCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingLink: string;
  title: string;
  leadName: string;
}

function extractJitsiRoom(link: string): string {
  try {
    const url = new URL(link);
    return url.pathname.replace(/^\//, '');
  } catch {
    return link.replace('https://meet.jit.si/', '');
  }
}

export default function VideoCallDialog({ open, onOpenChange, meetingLink, title, leadName }: VideoCallDialogProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { appointmentSettings: s } = useLeads();
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const room = extractJitsiRoom(meetingLink);

  const destroyApi = useCallback(() => {
    if (apiRef.current) {
      try { apiRef.current.dispose(); } catch {}
      apiRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const domain = s.videoProvider === 'custom' && s.customVideoBaseUrl
      ? new URL(s.customVideoBaseUrl).host
      : 'meet.jit.si';

    const toolbarButtons: string[] = ['microphone', 'camera', 'hangup', 'fullscreen', 'raisehand', 'select-background', 'participants-pane'];
    if (s.enableScreensharing) toolbarButtons.push('desktop', 'shareaudio');
    if (s.enableChat) toolbarButtons.push('chat');
    if (s.enableRecording) toolbarButtons.push('recording');
    if (s.enableTileView) toolbarButtons.push('tileview');
    toolbarButtons.push('sharedvideo');

    const initJitsi = () => {
      if (!containerRef.current) return;
      destroyApi();

      const api = new (window as any).JitsiMeetExternalAPI(domain, {
        roomName: room,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: {
          prejoinPageEnabled: s.prejoinEnabled,
          startWithAudioMuted: s.startWithAudioMuted,
          startWithVideoMuted: s.startWithVideoMuted,
          disableDeepLinking: true,
          hideConferenceSubject: true,
          subject: title,
          fileRecordingsEnabled: s.enableRecording,
          localRecording: { enabled: s.enableRecording, format: 'webm' },
          toolbarButtons,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          TOOLBAR_BUTTONS: toolbarButtons,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        },
        userInfo: {
          displayName: s.displayName || 'Mitarbeiter',
        },
      });

      api.addEventListener('readyToClose', () => {
        onOpenChange(false);
      });

      apiRef.current = api;
    };

    if ((window as any).JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = initJitsi;
      document.head.appendChild(script);
    }

    return () => {
      destroyApi();
    };
  }, [open, room, title, destroyApi, onOpenChange, s]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { destroyApi(); } onOpenChange(v); }}>
      <DialogContent
        className={`p-0 gap-0 overflow-hidden border-0 ${
          isFullscreen ? 'max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh]' : 'max-w-5xl max-h-[90vh] w-full'
        }`}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15">
              <Video className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{title}</p>
              <p className="text-[11px] text-muted-foreground">mit {leadName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-2 flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
            <button
              onClick={() => setIsFullscreen(f => !f)}
              className="rounded-lg p-1.5 hover:bg-muted transition-colors"
              title={isFullscreen ? 'Verkleinern' : 'Vollbild'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
              title="Anruf beenden"
            >
              <PhoneOff className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Jitsi container */}
        <div
          ref={containerRef}
          className={`bg-black ${isFullscreen ? 'h-[calc(98vh-52px)]' : 'h-[600px]'}`}
        />
      </DialogContent>
    </Dialog>
  );
}
