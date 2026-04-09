import { Award, Brain, Flame, Heart, Lightbulb, Shield, Star, Target, TrendingUp, Users, Zap, AlertTriangle, Sparkles, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonalityData {
  personality_title?: string;
  personality_avatar?: string;
  personality_summary?: string;
  personality_meaning?: string;
  personality_strengths_extended?: string[];
  personality_risks_extended?: string[];
  personality_type_combination?: string;
  top_motivators?: string[];
  dominant_disc_type?: string;
  match_interpretation?: string;
}

const avatarConfig: Record<string, { icon: any; gradient: string; border: string }> = {
  d: { icon: Flame, gradient: 'from-red-500 to-orange-500', border: 'border-red-200' },
  i: { icon: Lightbulb, gradient: 'from-amber-400 to-yellow-500', border: 'border-amber-200' },
  s: { icon: Heart, gradient: 'from-emerald-500 to-teal-500', border: 'border-emerald-200' },
  c: { icon: Shield, gradient: 'from-blue-500 to-indigo-500', border: 'border-blue-200' },
  d_i: { icon: Zap, gradient: 'from-red-500 to-amber-500', border: 'border-red-200' },
  i_d: { icon: Zap, gradient: 'from-amber-500 to-red-500', border: 'border-amber-200' },
  d_c: { icon: Target, gradient: 'from-red-500 to-blue-500', border: 'border-purple-200' },
  c_d: { icon: Target, gradient: 'from-blue-500 to-red-500', border: 'border-purple-200' },
  i_s: { icon: Users, gradient: 'from-amber-400 to-emerald-500', border: 'border-amber-200' },
  s_i: { icon: Users, gradient: 'from-emerald-500 to-amber-400', border: 'border-emerald-200' },
  s_c: { icon: Award, gradient: 'from-emerald-500 to-blue-500', border: 'border-teal-200' },
  c_s: { icon: Award, gradient: 'from-blue-500 to-emerald-500', border: 'border-teal-200' },
};

const motivatorLabels: Record<string, string> = {
  individualistisch: 'Individualistisch', theoretisch: 'Theoretisch', oekonomisch: 'Ökonomisch',
  traditionell: 'Traditionell', aesthetisch: 'Ästhetisch', sozial: 'Sozial',
};

const motivatorColors: Record<string, string> = {
  individualistisch: 'bg-violet-100 text-violet-700', theoretisch: 'bg-blue-100 text-blue-700',
  oekonomisch: 'bg-amber-100 text-amber-700', traditionell: 'bg-gray-100 text-gray-700',
  aesthetisch: 'bg-pink-100 text-pink-700', sozial: 'bg-emerald-100 text-emerald-700',
};

export default function PersonalityProfile({ data, compact = false }: { data: PersonalityData; compact?: boolean }) {
  if (!data.personality_title && !data.personality_summary) return null;

  const avatarKey = data.personality_avatar || data.dominant_disc_type?.toLowerCase() || 'd';
  const avatar = avatarConfig[avatarKey] || avatarConfig.d;
  const AvatarIcon = avatar.icon;

  return (
    <div className="space-y-4">
      {/* Hero: Avatar + Title + Summary */}
      <div className={cn("rounded-xl border p-4", avatar.border, "bg-gradient-to-br from-background to-muted/30")}>
        <div className="flex items-start gap-4">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shrink-0 shadow-md", avatar.gradient)}>
            <AvatarIcon className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold">{data.personality_title || 'Persönlichkeitsprofil'}</h3>
              {data.personality_type_combination && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {data.personality_type_combination}
                </span>
              )}
            </div>
            {data.top_motivators && data.top_motivators.length > 0 && (
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {data.top_motivators.map(m => (
                  <span key={m} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", motivatorColors[m] || 'bg-muted text-muted-foreground')}>
                    {motivatorLabels[m] || m}
                  </span>
                ))}
              </div>
            )}
            {data.personality_summary && (
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">{data.personality_summary}</p>
            )}
          </div>
        </div>
      </div>

      {!compact && (
        <>
          {/* Meaning */}
          {data.personality_meaning && (
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold">Was dieses Profil bedeutet</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{data.personality_meaning}</p>
            </div>
          )}

          {/* Match Interpretation */}
          {data.match_interpretation && (
            <div className="rounded-xl border p-4 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold">SSM Match-Interpretation</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{data.match_interpretation}</p>
            </div>
          )}

          {/* Extended Strengths & Risks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.personality_strengths_extended && data.personality_strengths_extended.length > 0 && (
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-xs font-semibold">Erweiterte Stärken</h4>
                </div>
                <ul className="space-y-1.5">
                  {data.personality_strengths_extended.map((s, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✦</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.personality_risks_extended && data.personality_risks_extended.length > 0 && (
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h4 className="text-xs font-semibold">Mögliche Risiken</h4>
                </div>
                <ul className="space-y-1.5">
                  {data.personality_risks_extended.map((r, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
