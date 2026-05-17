CREATE TABLE `prescriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageUrl` varchar(512) NOT NULL,
	`imageKey` varchar(256) NOT NULL,
	`fileName` varchar(256),
	`analysisStatus` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`analysisError` text,
	`medications` json,
	`rawAnalysis` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prescriptions_id` PRIMARY KEY(`id`)
);
