CREATE TABLE [DataDump] (  
	[DataId] INTEGER  PRIMARY KEY NOT NULL,
	[User] NVARCHAR(50) NOT NULL, 
	[Datetime] DATETIME  NULL,
	[Action] NVARCHAR(50) NULL
);     

CREATE TABLE [UserState] (  
	[DataId] INTEGER  PRIMARY KEY NOT NULL,
	[User] NVARCHAR(50) NOT NULL, 
	[Data] TEXT  NULL,   
	[Datetime] DATETIME  NULL
);     