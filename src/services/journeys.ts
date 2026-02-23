import { supabase } from '../lib/supabaseClient';
import type { Journey, UserJourneyProgress } from '../types/journey';

// Import all journey JSON files
import wildernessJourney from '../data/journeys/wilderness-journey.json';
import davidsRise from '../data/journeys/davids-rise.json';
import josephsJourney from '../data/journeys/josephs-journey.json';
import petersTransformation from '../data/journeys/peters-transformation.json';
import breakingChains from '../data/journeys/breaking-chains.json';
import nehemiahRebuilding from '../data/journeys/nehemiah-rebuilding.json';
import prodigalsReturn from '../data/journeys/prodigals-return.json';
import paulsConversion from '../data/journeys/pauls-conversion.json';
import gideonsVictory from '../data/journeys/gideons-victory.json';
import esthersCourage from '../data/journeys/esthers-courage.json';
import jonahsFlight from '../data/journeys/jonahs-flight.json';

const ALL_JOURNEYS: Journey[] = [
  wildernessJourney,
  davidsRise,
  josephsJourney,
  petersTransformation,
  breakingChains,
  nehemiahRebuilding,
  prodigalsReturn,
  paulsConversion,
  gideonsVictory,
  esthersCourage,
  jonahsFlight,
] as Journey[];

export function getAllJourneys(): Journey[] {
  return ALL_JOURNEYS;
}

export function getJourneyById(journeyId: string): Journey | null {
  return ALL_JOURNEYS.find(j => j.id === journeyId) || null;
}

export async function getUserJourneyProgress(
  journeyId: string
): Promise<UserJourneyProgress | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from('user_journey_progress')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('journey_id', journeyId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[JourneyProgress] Load error:', error);
  }

  return data;
}

export async function startJourney(journeyId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_journey_progress')
    .insert({
      user_id: session.user.id,
      journey_id: journeyId,
      current_location: 0,
      completed_locations: [],
      started_at: new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function completeLocation(
  journeyId: string,
  locationIndex: number
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const progress = await getUserJourneyProgress(journeyId);
  if (!progress) throw new Error('Journey not started');

  const completedLocations = [...progress.completed_locations];
  if (!completedLocations.includes(locationIndex)) {
    completedLocations.push(locationIndex);
  }

  const journey = getJourneyById(journeyId);
  const isComplete = journey && completedLocations.length === journey.locations.length;

  const { error } = await supabase
    .from('user_journey_progress')
    .update({
      current_location: Math.min(locationIndex + 1, (journey?.locations.length || 6) - 1),
      completed_locations: completedLocations,
      last_viewed_at: new Date().toISOString(),
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq('user_id', session.user.id)
    .eq('journey_id', journeyId);

  if (error) throw error;
}

export async function updateJourneyLastViewed(journeyId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  await supabase
    .from('user_journey_progress')
    .update({ last_viewed_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
    .eq('journey_id', journeyId);
}
