import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Video, X, Maximize2, Minimize2, PhoneOff } from 'lucide-react';

interface VideoCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingLink: string;
  title: string;
  leadName: string;
}

function extractJitsiRoom(link: string): string {
  // https://meet.jit.si/recruitflow-abc-def-ghi → recruitflow-abc-def-ghi
  try {
    const url = new URL(link);
    return url.pathname.replace(/^\//, '');
  } catch {
    return link.replace('https://meet.jit.si/', '');
  }
}

export default function VideoCallDialog({ open, onOpenChange, meetingLink, title, leadName }: VideoCallDialogProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const room = extractJitsiRoom(meetingLink);
  const iframeSrc = `https://meet.jit.si/${room}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","desktop","chat","raisehand","tileview","hangup"]`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`p-0 gap-0 overflow-hidden border-0 ${
          isFullscreen ? 'max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh]' : 'max-w-4xl max-h-[85vh] w-full'
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

        {/* Jitsi iframe */}
        <div className={`bg-black ${isFullscreen ? 'h-[calc(98vh-52px)]' : 'h-[560px]'}`}>
          <iframe
            src={iframeSrc}
            allow="camera; microphone; display-capture; autoplay; clipboard-write"
            className="w-full h-full border-0"
            title="Video-Call"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
