import type { UnBrandedJob } from "@sho/models";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/Item";
import { formatDate } from "@/util";
import styles from "./JobDetail.module.css";
import { WorkPlaceMap } from "./WorkPlaceMap";

export function JobDetail(props: { jobDetail: UnBrandedJob }) {
  const {
    jobNumber,
    companyName,
    occupation,
    employmentType,
    wage,
    workPlace,
    jobDescription,
    expiryDate,
    workingHours,
    qualifications,
  } = props.jobDetail;
  return (
    <article className={styles["layout-job-detail"]}>
      <h2>求人番号: {jobNumber}</h2>
      <ItemGroup>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>企業名</ItemTitle>
            <ItemDescription>{companyName ?? "未記載"}</ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>職種</ItemTitle>
            <ItemDescription>{occupation}</ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>求人区分</ItemTitle>
            <ItemDescription>{employmentType}</ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>職務概要</ItemTitle>
            <ItemDescription>{jobDescription ?? "未記載"}</ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>賃金</ItemTitle>
            <ItemDescription>
              {wage ? `${wage.min}円〜${wage.max}円` : "未記載"}
            </ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>就業場所</ItemTitle>
            <ItemDescription>{workPlace ?? "未記載"}</ItemDescription>
          </ItemContent>
        </Item>
        {workPlace && <WorkPlaceMap address={workPlace} />}
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>紹介期限</ItemTitle>
            <ItemDescription>{formatDate(expiryDate)}</ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>勤務時間</ItemTitle>
            <ItemDescription>
              {workingHours
                ? `${workingHours.start ?? "?"}〜${workingHours.end ?? "?"}`
                : "未記載"}
            </ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>必須資格</ItemTitle>
            <ItemDescription>{qualifications ?? "未記載"}</ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
    </article>
  );
}
