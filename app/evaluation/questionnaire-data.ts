export interface SUSItem {
  id: number;
  text: string;
  positive: boolean; // true = positive wording, false = negative wording
}

export const susItems: SUSItem[] = [
  {id: 1, text: "I think that I would like to use this system frequently.", positive: true},
  {id: 2, text: "I found the system unnecessarily complex.", positive: false},
  {id: 3, text: "I thought the system was easy to use.", positive: true},
  {
    id: 4,
    text: "I think that I would need the support of a technical person to be able to use this system.",
    positive: false,
  },
  {id: 5, text: "I found the various functions in this system were well integrated.", positive: true},
  {id: 6, text: "I thought there was too much inconsistency in this system.", positive: false},
  {id: 7, text: "I would imagine that most people would learn to use this system very quickly.", positive: true},
  {id: 8, text: "I found the system very cumbersome to use.", positive: false},
  {id: 9, text: "I felt very confident using the system.", positive: true},
  {
    id: 10,
    text: "I needed to learn a lot of things before I could get going with this system.",
    positive: false,
  },
];

export const susScaleLabels = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] as const;

export function computeSUSScore(items: number[]): number {
  // For odd-numbered items (positive): contribution = rating - 1
  // For even-numbered items (negative): contribution = 5 - rating
  // SUS score = sum of contributions × 2.5
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const rating = items[i];
    if (i % 2 === 0) {
      // Odd items (1,3,5,7,9) — positive wording
      sum += rating - 1;
    } else {
      // Even items (2,4,6,8,10) — negative wording
      sum += 5 - rating;
    }
  }
  return sum * 2.5;
}

export interface NASATLXDimension {
  id: string;
  label: string;
  description: string;
  lowAnchor: string;
  highAnchor: string;
}

export const nasaTlxDimensions: NASATLXDimension[] = [
  {
    id: "mentalDemand",
    label: "Mental Demand",
    description: "How mentally demanding was the task?",
    lowAnchor: "Very Low",
    highAnchor: "Very High",
  },
  {
    id: "physicalDemand",
    label: "Physical Demand",
    description: "How physically demanding was the task?",
    lowAnchor: "Very Low",
    highAnchor: "Very High",
  },
  {
    id: "temporalDemand",
    label: "Temporal Demand",
    description: "How hurried or rushed was the pace of the task?",
    lowAnchor: "Very Low",
    highAnchor: "Very High",
  },
  {
    id: "performance",
    label: "Performance",
    description: "How successful were you in accomplishing what you were asked to do?",
    lowAnchor: "Perfect",
    highAnchor: "Failure",
  },
  {
    id: "effort",
    label: "Effort",
    description: "How hard did you have to work to accomplish your level of performance?",
    lowAnchor: "Very Low",
    highAnchor: "Very High",
  },
  {
    id: "frustration",
    label: "Frustration",
    description: "How insecure, discouraged, irritated, stressed, and annoyed were you?",
    lowAnchor: "Very Low",
    highAnchor: "Very High",
  },
];
