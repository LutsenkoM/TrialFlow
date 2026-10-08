import { DiscontinuationBars } from './DiscontinuationBars'
import { EnrollmentHeatmap } from './EnrollmentHeatmap'
import { ArmLegend } from './ArmLegend'
import { RetentionChart } from './RetentionChart'
import type { useInsights } from './useInsights'

export type Insights = ReturnType<typeof useInsights>

/** The three charts as an ordered list, reused by the desktop panel and mobile cards. */
export function insightSections(data: Insights) {
  return [
    {
      key: 'retention',
      title: 'Retention',
      hint: 'Kaplan–Meier · protocol weeks',
      body: (
        <>
          <RetentionChart curves={data.km} />
          <ArmLegend />
        </>
      ),
    },
    {
      key: 'dropouts',
      title: 'Discontinuations',
      hint: '% of randomized',
      body: <DiscontinuationBars stats={data.stats} />,
    },
    {
      key: 'enrollment',
      title: 'Enrollment by site',
      hint: 'screenings / week',
      body: <EnrollmentHeatmap rows={data.heatmap} week={data.week} />,
    },
  ]
}
