import React from "react";
import "./SidebarDescription.css";

type SidebarDescriptionProps = {
  title: string;
  address: string;
  details: { label: string; value: string | number | null }[];
  imageUrl?: string;
};

export const SidebarDescription: React.FC<SidebarDescriptionProps> = ({
  title,
  address,
  details,
  imageUrl,
}) => {
  return (
    <div className="sidebar-description">
      {imageUrl && <img src={imageUrl} alt={title} className="sidebar-image" />}
      <h2 className="sidebar-title">{title}</h2>
      <p className="sidebar-address">{address}</p>
      <ul className="sidebar-details">
        {details.map((detail, index) => (
          <li key={index} className="sidebar-detail">
            <strong>{detail.label}:</strong> {detail.value || "N/A"}
          </li>
        ))}
      </ul>
    </div>
  );
};