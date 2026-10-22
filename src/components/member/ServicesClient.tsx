"use client";

import React from "react";
import { formatWAT, SERVICE_SCHEDULE } from "@/lib/time";

interface UserAssignment {
  id: string;
  service_occurrence_id: string;
  duty_post_id: string;
  is_draft: boolean;
  notes: string | null;
  duty_post: {
    id: string;
    name: string;
    service_type: string;
  } | null;
  service_occurrence: {
    id: string;
    occurrence_date: string;
    start_time: string;
    end_time: string;
    service_type: string;
    roster_published: boolean;
    service: {
      name: string;
    } | null;
  } | null;
}

interface RosterItem {
  id: string;
  notes: string | null;
  duty_post: {
    id: string;
    name: string;
    sort_order: number | null;
  } | null;
  member: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
  } | null;
}

interface ServicesClientProps {
  userAssignments: UserAssignment[];
  nextPublishedOccurrence?: any;
  nextServiceRoster?: RosterItem[];
  latestDressCode: any;
  currentUserId: string;
}

export function ServicesClient({
  userAssignments,
  latestDressCode,
  currentUserId,
}: ServicesClientProps) {
  const formatServiceTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hrs, mins] = timeStr.split(":");
    const h = parseInt(hrs, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${displayH}:${mins} ${ampm}`;
  };

  return (
    <div className="services-page">
      {/* Page Header */}
      <header className="page-header">
        <div>
          <span className="page-category">ROSTER &amp; SCHEDULE</span>
          <h1 className="page-title">Services &amp; Duty Schedule</h1>
          <p className="page-subtitle">
            View your upcoming duty posts, weekly schedule, and attire
            instructions.
          </p>
        </div>
      </header>

      {/* ================= 1. MY UPCOMING ASSIGNMENTS ================= */}
      <section className="section-block">
        <div className="section-header">
          <div className="section-title-wrap">
            <div className="section-icon-badge royal">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2.2"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h2 className="section-title">My Upcoming Assignments</h2>
              <span className="section-sub">
                Duty posts assigned to you for the next 4 weeks
              </span>
            </div>
          </div>
          <span className="count-pill">{userAssignments.length} scheduled</span>
        </div>

        {userAssignments.length > 0 ? (
          <div className="assignments-grid">
            {userAssignments.map((assignment) => {
              const occ = assignment.service_occurrence;
              return (
                <div key={assignment.id} className="assignment-card">
                  <div className="assignment-top-row">
                    <span className="service-badge">
                      {occ?.service?.name ||
                        `${occ?.service_type?.toUpperCase()} SERVICE`}
                    </span>
                    <span className="assignment-status-tag">Assigned</span>
                  </div>

                  <div className="assignment-post-name">
                    {assignment.duty_post?.name || "General Post"}
                  </div>

                  <div className="assignment-meta-details">
                    <div className="meta-item">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>
                        {occ?.occurrence_date
                          ? formatWAT(occ.occurrence_date, "EEEE, d MMMM yyyy")
                          : "Date TBD"}
                      </span>
                    </div>

                    <div className="meta-item">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>
                        {occ?.start_time
                          ? formatServiceTime(occ.start_time)
                          : ""}{" "}
                        – {occ?.end_time ? formatServiceTime(occ.end_time) : ""}
                      </span>
                    </div>

                    {assignment.notes && (
                      <div className="meta-notes">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="8" y1="6" x2="21" y2="6" />
                          <line x1="8" y1="12" x2="21" y2="12" />
                          <line x1="8" y1="18" x2="21" y2="18" />
                        </svg>
                        <span>{assignment.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state-card">
            <div className="empty-state-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1.8"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className="empty-state-title">
              No duty assignments scheduled yet
            </h3>
            <p className="empty-state-text">
              You do not have any duty posts scheduled for the upcoming
              services. Contact leadership or your unit head for duty
              allocations.
            </p>
          </div>
        )}
      </section>

      {/* ================= 3. SERVICE SCHEDULE & 4. DRESS CODE ================= */}
      <div className="two-col-layout">
        {/* Service Schedule Card */}
        <section className="section-block">
          <div className="section-header">
            <div className="section-title-wrap">
              <div className="section-icon-badge purple">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="2.2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <h2 className="section-title">Weekly Service Schedule</h2>
                <span className="section-sub">
                  Standard times & absence deadlines
                </span>
              </div>
            </div>
          </div>

          <div className="schedule-cards-list">
            {SERVICE_SCHEDULE.map((s) => (
              <div key={s.type} className="schedule-item-card">
                <div className="schedule-day-badge">
                  <span className="day-name">
                    {s.day.substring(0, 3).toUpperCase()}
                  </span>
                </div>
                <div className="schedule-info">
                  <h4 className="schedule-name">{s.name}</h4>
                  <div className="schedule-time-row">
                    <span className="time-highlight">
                      {s.startTime} – {s.endTime}
                    </span>
                    <span className="deadline-sub">
                      Absence deadline: {s.absenceDeadline}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="schedule-policy-box">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              Ushers must arrive at least 30 minutes before service starts on
              Tuesdays and Fridays while 40 minutes before Sunday Services.
              Attendance window closes at the absence deadline.
            </span>
          </div>
        </section>

        {/* Upcoming Sunday Dress Code Card */}
        <section className="section-block">
          <div className="section-header">
            <div className="section-title-wrap">
              <div className="section-icon-badge orange">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="2.2"
                >
                  <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
                </svg>
              </div>
              <div>
                <h2 className="section-title">Upcoming Sunday Dress Code</h2>
                <span className="section-sub">
                  Required attire for Sunday service
                </span>
              </div>
            </div>
          </div>

          {latestDressCode ? (
            <div className="dress-code-box">
              <div className="dress-date-header">
                <span className="dress-sunday-tag">SUNDAY ATTIRE</span>
                <span className="dress-sunday-date">
                  {formatWAT(
                    latestDressCode.applicable_sunday,
                    "EEEE, d MMMM yyyy",
                  )}
                </span>
              </div>

              <div className="dress-instructions-text">
                {latestDressCode.instructions}
              </div>

              {latestDressCode.image_url && (
                <div className="dress-photo-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={latestDressCode.image_url}
                    alt="Sunday Dress Code Reference"
                    className="dress-img"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state-card small">
              <p className="empty-state-text">
                Dress code guidelines for the upcoming Sunday have not yet been
                posted by leadership.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ================= STYLES ================= */}
      <style jsx>{`
        .services-page {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .page-header {
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 20px;
        }

        .page-category {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #1d4ed8;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 800;
          color: #111827;
          margin: 0 0 6px 0;
          letter-spacing: -0.5px;
        }

        .page-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        /* Section block */
        .section-block {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          padding: 24px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .section-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-icon-badge {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .section-icon-badge.royal {
          background-color: #eff6ff;
        }

        .section-icon-badge.green {
          background-color: #f0fdf4;
        }

        .section-icon-badge.purple {
          background-color: #f5f3ff;
        }

        .section-icon-badge.orange {
          background-color: #fff7ed;
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .section-sub {
          font-size: 12.5px;
          color: #6b7280;
        }

        .count-pill {
          font-size: 12px;
          font-weight: 600;
          color: #1d4ed8;
          background-color: #eff6ff;
          padding: 4px 10px;
          border-radius: 20px;
        }

        .published-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #15803d;
          background-color: #dcfce7;
          padding: 4px 10px;
          border-radius: 20px;
        }

        .green-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #16a34a;
        }

        /* Assignments Grid */
        .assignments-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        @media (min-width: 640px) {
          .assignments-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .assignments-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .assignment-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition:
            transform 0.15s,
            border-color 0.15s;
        }

        .assignment-card:hover {
          border-color: #93c5fd;
          transform: translateY(-2px);
        }

        .assignment-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .service-badge {
          font-size: 11px;
          font-weight: 700;
          color: #1d4ed8;
          background-color: #eff6ff;
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: 0.3px;
        }

        .assignment-status-tag {
          font-size: 11px;
          font-weight: 600;
          color: #15803d;
          background-color: #dcfce7;
          padding: 2px 7px;
          border-radius: 4px;
        }

        .assignment-post-name {
          font-size: 17px;
          font-weight: 800;
          color: #111827;
        }

        .assignment-meta-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12.5px;
          color: #4b5563;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .meta-notes {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 12px;
          color: #6b7280;
          font-style: italic;
          background: #ffffff;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px dashed #cbd5e1;
        }

        /* Empty State */
        .empty-state-card {
          text-align: center;
          padding: 36px 20px;
          background-color: #f9fafb;
          border-radius: 10px;
          border: 1px dashed #d1d5db;
        }

        .empty-state-card.small {
          padding: 24px 16px;
        }

        .empty-state-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .empty-state-title {
          font-size: 16px;
          font-weight: 700;
          color: #374151;
          margin: 0 0 6px 0;
        }

        .empty-state-text {
          font-size: 13.5px;
          color: #6b7280;
          max-width: 460px;
          margin: 0 auto;
          line-height: 1.5;
        }

        @media (max-width: 640px) {
          .section-block {
            padding: 18px 14px;
            border-radius: 12px;
          }

          .page-title {
            font-size: 24px;
          }

          .schedule-item-card {
            padding: 10px 12px;
            gap: 10px;
          }

          .schedule-time-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }

        /* 2-Column Schedule & Dress Code */
        .two-col-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        @media (min-width: 840px) {
          .two-col-layout {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .schedule-cards-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .schedule-item-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
        }

        .schedule-day-badge {
          width: 44px;
          height: 44px;
          background-color: #f5f3ff;
          border: 1px solid #ddd6fe;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .day-name {
          font-size: 12px;
          font-weight: 800;
          color: #7c3aed;
        }

        .schedule-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .schedule-name {
          font-size: 14px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .schedule-time-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .time-highlight {
          font-size: 12.5px;
          font-weight: 600;
          color: #1d4ed8;
        }

        .deadline-sub {
          font-size: 11.5px;
          color: #dc2626;
          font-weight: 500;
        }

        .schedule-policy-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          font-size: 12px;
          color: #1e40af;
          line-height: 1.4;
        }

        /* Dress code section */
        .dress-code-box {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .dress-date-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          padding: 12px 16px;
          border-radius: 8px;
        }

        .dress-sunday-tag {
          font-size: 10.5px;
          font-weight: 700;
          color: #c2410c;
          letter-spacing: 0.8px;
        }

        .dress-sunday-date {
          font-size: 14px;
          font-weight: 700;
          color: #9a3412;
        }

        .dress-instructions-text {
          font-size: 14px;
          color: #374151;
          line-height: 1.6;
          white-space: pre-line;
          background: #fafafa;
          padding: 14px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .dress-photo-preview {
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          max-height: 240px;
        }

        .dress-img {
          width: 100%;
          height: auto;
          max-height: 240px;
          object-fit: cover;
          display: block;
        }

        @media (max-width: 640px) {
          .page-header {
            text-align: center;
          }

          .section-block {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
